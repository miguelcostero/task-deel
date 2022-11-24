const { Router } = require('express');
const { Op } = require('sequelize');
const _ = require('lodash');

const balancesController = Router();

const BALANCE_PERCENTAGE = 25;

/**
 * Deposits money into the the the balance of a client
 */
balancesController.post('/deposit/:userId', async (req, res) => {
    const {
        body: { amount },
    } = req;
    if (!amount || !_.isNumber(amount)) {
        return res.status(400).json({ message: 'Amount is required and must be a number' });
    }

    const { Profile, Job, Contract } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    const transaction = await sequelize.transaction();

    try {
        const client = await Profile.findOne({
            where: { id: req.params.userId, type: 'client' },
            lock: true,
            transaction: transaction,
        });
        if (!client) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Client not found' });
        }

        const contracts = await Contract.findAll({
            where: { ClientId: client.id, status: { [Op.or]: ['new', 'in_progress'] } },
            include: {
                model: Job,
                where: { paid: { [Op.or]: [false, null] } },
            },
            lock: true,
            transaction: transaction,
        });

        const totalUnpaid = contracts.reduce((acc, contract) => {
            return (
                acc +
                contract.Jobs.reduce((acc, job) => {
                    return acc + job.price;
                }, 0)
            );
        }, 0);
        if (amount > totalUnpaid * (BALANCE_PERCENTAGE / 100)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Amount is too high' });
        }

        client.balance += amount;
        await client.save({ transaction: transaction });

        await transaction.commit();
        res.json(client);
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = balancesController;
