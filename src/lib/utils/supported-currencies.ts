import { Erc20 } from '@lens-protocol/client';

export const SUPPORTED_CURRENCIES: Erc20[] = [
    {
        __typename: 'Erc20',
        name: 'Wrapped Grass',
        symbol: 'WGRASS',
        decimals: 18,
        contract: {
            __typename: 'NetworkAddress',
            address: '0xeee5a340Cdc9c179Db25dea45AcfD5FE8d4d3eB8',
            chainId: 37111,
        },
    },
    {
        __typename: 'Erc20',
        name: 'Wrapped GHO',
        symbol: 'WGHO',
        decimals: 18,
        contract: {
            __typename: 'NetworkAddress',
            address: '0x6bDc36E20D267Ff0dd6097799f82e78907105e2F',
            chainId: 232,
        },
    },
    {
        __typename: 'Erc20',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        contract: {
            __typename: 'NetworkAddress',
            address: '0xE5ecd226b3032910CEaa43ba92EE8232f8237553',
            chainId: 232,
        },
    },
    {
        __typename: 'Erc20',
        name: 'USDC',
        symbol: 'USDC',
        decimals: 6,
        contract: {
            __typename: 'NetworkAddress',
            address: '0x88F08E304EC4f90D644Cec3Fb69b8aD414acf884',
            chainId: 232,
        },
    },
    {
        __typename: 'Erc20',
        name: 'Bonsai',
        symbol: 'BONSAI',
        decimals: 18,
        contract: {
            __typename: 'NetworkAddress',
            address: '0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82',
            chainId: 232,
        },
    },
];
