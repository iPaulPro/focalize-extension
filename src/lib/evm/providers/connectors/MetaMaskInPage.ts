const ConnectToMetaMask = async (
    MetaMaskInPageProvider: any
) => {
    const provider = MetaMaskInPageProvider();
    await provider.enable();
    return provider;
};

export default ConnectToMetaMask;