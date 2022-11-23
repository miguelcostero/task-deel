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

module.exports = jobsController;
