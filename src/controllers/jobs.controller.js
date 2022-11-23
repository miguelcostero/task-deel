const { Router } = require('express');
const { Op } = require('sequelize');

const jobsController = Router();

jobsController.get('/unpaid', async (req, res) => {
    const { profile } = req;
    const { Job, Contract } = req.app.get('models');

    const jobs = await Job.findAll({
        where: {
            paid: {
                [Op.or]: [null, false],
            },
        },

        include: {
            model: Contract,
            where: {
                [profile.type === 'client' ? 'ClientId' : 'ContractorId']: profile.id,
                status: { [Op.ne]: 'terminated' },
            },
        },
    });

    res.json(jobs);
});

jobsController.post('/:id/pay', async (req, res) => {
    const { profile } = req;
    const { Job, Contract, Profile } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    const transaction = await sequelize.transaction();

    try {
        if (profile.type !== 'client') {
            return res.status(403).json({ message: 'Only clients can pay for jobs' });
        }

        const job = await Job.findOne({
            where: { id: req.params.id },
            include: {
                model: Contract,
                where: { ClientId: profile.id },
            },
            lock: true,
            transaction: transaction,
        });

        if (!job) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Job not found' });
        }

        if (job.paid) {
            await transaction.rollback();
            return res.status(409).json({ message: 'Job is already paid' });
        }

        if (profile.balance < job.price) {
            await transaction.rollback();
            return res.status(402).json({ message: 'Insufficient funds' });
        }

        const contract = await Contract.findOne({
            where: { id: job.ContractId },
            lock: true,
            transaction: transaction,
        });
        if (!contract) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Contract not found' });
        }

        if (contract.status === 'terminated') {
            await transaction.rollback();
            return res.status(409).json({ message: 'Contract is terminated' });
        }

        const contractor = await Profile.findOne({
            where: { id: job.Contract.ContractorId },
            lock: true,
            transaction: transaction,
        });
        if (!contractor) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Contractor not found' });
        }

        await profile.update({ balance: profile.balance - job.price }, { transaction: transaction });
        await contractor.update({ balance: contractor.balance + job.price }, { transaction: transaction });
        await job.update({ paid: true, paymentDate: new Date() }, { transaction: transaction });
        await contract.update({ status: 'terminated' }, { transaction: transaction });

        await transaction.commit();

        res.json(job);
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = jobsController;
