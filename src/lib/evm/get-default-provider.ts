import { AlchemyProvider, type Provider } from 'ethers';
import { ALCHEMY_ETH_API_KEY } from '../../config';

export const getDefaultProvider = (): Provider =>
    new AlchemyProvider('mainnet', ALCHEMY_ETH_API_KEY);
