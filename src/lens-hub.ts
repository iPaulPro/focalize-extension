import type {Provider} from "@ethersproject/abstract-provider";
import {Contract, Signer} from "ethers"
import {LENS_HUB_ABI, LENS_HUB_CONTRACT} from './config';

export const getLensHub = (
    signer: Signer | Provider
): Contract => new Contract(LENS_HUB_CONTRACT, LENS_HUB_ABI, signer);
