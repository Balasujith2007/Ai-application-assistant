declare const _default: () => {
    port: number;
    frontendUrl: string;
    database: {
        url: string | undefined;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    ai: {
        apiKey: string;
        model: string;
    };
    storage: {
        provider: string;
        bucket: string;
        region: string;
        accessKey: string;
        secretKey: string;
    };
};
export default _default;
