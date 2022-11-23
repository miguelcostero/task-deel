const { Router } = require('express');
const { Op } = require('sequelize');
const { doesContractBelongToProfile } = require('../helpers/does-contract-belong-to-profile.helper');

const contractsController = Router();

contractsController.get('/', async (req, res) => {
    const { profile } = req;
    const { Contract } = req.app.get('models');

    const contracts = await Contract.findAll({
        where: {
            [profile.type === 'client' ? 'ClientId' : 'ContractorId']: profile.id,
            status: { [Op.ne]: 'terminated' },
        },
    });

    res.json(contracts);
});

contractsController.get('/:id', async (req, res) => {
    const { Contract } = req.app.get('models');
    const { id } = req.params;

    const contract = await Contract.findOne({ where: { id } });
    if (!contract) {
        return res.status(404).end();
    }

    if (!doesContractBelongToProfile(contract, req.profile)) {
        return res.status(403).end();
    }

    res.json(contract);
});

module.exports = contractsController;
