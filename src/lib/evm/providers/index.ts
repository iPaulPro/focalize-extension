import type {IProviderInfo} from "web3modal";

import MetaMaskLogo from '../../../assets/metamask.svg';

export const METAMASK_INPAGE: IProviderInfo = {
    id: "metamask-inpage",
    name: "MetaMask",
    logo: MetaMaskLogo,
    type: "web",
    check: "isMetaMaskInPage",
}