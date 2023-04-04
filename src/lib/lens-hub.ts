import {LENS_HUB_CONTRACT} from '../config';
import {getSigner} from "./ethers-service";
import {LensHub__factory} from "../contracts/types";

import type {LensHub} from "../contracts/types";

export const getLensHub = (): LensHub => LensHub__factory.connect(LENS_HUB_CONTRACT, getSigner());
