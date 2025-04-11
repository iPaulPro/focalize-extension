import axios from 'axios';

export const getLatestRelease = async () => {
    const res = await axios.get(
        'https://api.github.com/repos/iPaulPro/focalize-extension/releases/latest',
    );
    return res.data;
};
