/**
 * Check whether if a contract belongs to a profile
 *
 * @param {*} contract
 * @param {*} profile
 * @returns {boolean}
 */
const doesContractBelongToProfile = (contract, profile) => {
    if (profile.type === 'client' && contract.ClientId === profile.id) {
        return true;
    }

    if (profile.type === 'contractor' && contract.ContractorId === profile.id) {
        return true;
    }

    return false;
};

module.exports = { doesContractBelongToProfile };
