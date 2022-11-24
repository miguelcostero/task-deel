const { Router } = require('express');
const { Op } = require('sequelize');
const { isValid, isBefore } = require('date-fns');

const adminController = Router();

const DEFAULT_LIMIT_VALUE = 2;

adminController.get('/best-profession', async (req, res) => {
    const {
        query: { start, end },
    } = req;
    if (!start || !end) {
        return res.status(400).json({ message: 'Start and end dates are required' });
    }
    if (!isValid(new Date(start)) || !isValid(new Date(end))) {
        return res.status(400).json({ message: 'Start and end dates must be valid' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isBefore(endDate, startDate)) {
        return res.status(400).json({ message: 'Start date must be before end date' });
    }

    const { Profile, Contract, Job } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    const transaction = await sequelize.transaction();

    try {
        const profession = await Job.findAll({
            where: {
                paid: true,
                paymentDate: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },

            include: {
                model: Contract,
                attributes: [],
                include: {
                    model: Profile,
                    as: 'Contractor',
                    attributes: [],
                    where: { type: 'contractor' },
                },
            },

            attributes: [
                [sequelize.fn('SUM', sequelize.col('price')), 'total'],
                [sequelize.col('Contract->Contractor.profession'), 'profession'],
            ],

            group: [sequelize.col('Contract->Contractor.profession')],
            order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],

            limit: 1,
            transaction: transaction,
        });

        await transaction.commit();
        return res.json(profession);
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        return res.status(500).json({ message: 'Internal server error' });
    }
});

adminController.get('/best-clients', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : DEFAULT_LIMIT_VALUE;
    const start = req.query.start;
    const end = req.query.end;

    console.log(req.query.limit);

    if (!start || !end) {
        return res.status(400).json({ message: 'Start and end dates are required' });
    }
    if (!isValid(new Date(start)) || !isValid(new Date(end))) {
        return res.status(400).json({ message: 'Start and end dates must be valid' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isBefore(endDate, startDate)) {
        return res.status(400).json({ message: 'Start date must be before end date' });
    }

    const { Profile, Contract, Job } = req.app.get('models');
    const sequelize = req.app.get('sequelize');
    const transaction = await sequelize.transaction();

    try {
        const clients = await Job.findAll({
            where: {
                paid: true,
                paymentDate: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },

            include: {
                model: Contract,
                required: true,
                attributes: [],

                include: [
                    {
                        model: Profile,
                        as: 'Client',
                        attributes: [],
                        where: { type: 'client' },
                        required: true,
                    },
                ],
            },

            attributes: [
                [sequelize.fn('sum', sequelize.col('price')), 'total'],
                [sequelize.col('Contract.Client.id'), 'id'],
                [
                    sequelize.literal("`Contract->Client`.`firstName` || ' ' || `Contract->Client`.`lastName`"),
                    'fullName',
                ],
            ],

            group: [sequelize.col('Contract.Client.id')],
            order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],

            limit: limit,
            transaction: transaction,
        });

        await transaction.commit();
        return res.json(clients);
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = adminController;
