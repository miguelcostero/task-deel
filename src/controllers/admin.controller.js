const { Router } = require('express');
const { Op } = require('sequelize');
const { isValid, isBefore } = require('date-fns');

const adminController = Router();

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
        const contracts = await Contract.findAll({
            where: {
                createdAt: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },
            include: [
                {
                    model: Job,
                    attributes: [],
                    where: { paid: true },
                },
                {
                    model: Profile,
                    as: 'Contractor',
                    attributes: [],
                    where: { type: 'contractor' },
                },
            ],
            attributes: [
                [sequelize.fn('SUM', sequelize.col('Jobs.price')), 'total'],
                [sequelize.literal(`firstName || ' ' || lastName`), 'fullName'],
                [sequelize.col('Contractor.profession'), 'profession'],
            ],
            group: [sequelize.col('Contractor.profession')],
            order: [[sequelize.fn('sum', sequelize.col('Jobs.price')), 'DESC']],
            transaction: transaction,
        });

        await transaction.commit();
        return res.json(contracts);
    } catch (err) {
        console.error(err);
        await transaction.rollback();
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = adminController;
