import {Contract} from "ethers"
import {LENS_HUB_ABI, LENS_HUB_CONTRACT} from './config';
import {getSigner} from "./lib/ethers-service";

export const getLensHub = (): Contract => new Contract(LENS_HUB_CONTRACT, LENS_HUB_ABI, getSigner());
