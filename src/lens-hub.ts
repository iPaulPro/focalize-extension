import {LENS_HUB_CONTRACT} from './config';
import {getSigner} from "./lib/ethers-service";
import {LensHub__factory} from "../types/ethers-contracts";

import type {LensHub} from "../types/ethers-contracts";

export const getLensHub = (): LensHub => LensHub__factory.connect(LENS_HUB_CONTRACT, getSigner());
