import Bull from 'bull';

const useTls = process.env.REDIS_TLS === 'true';

const redisConfig: Bull.QueueOptions['redis'] = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ...(useTls && { tls: {} }),
};

export function createQueue<T>(name: string): Bull.Queue<T> {
    const queue = new Bull<T>(name, {
        redis: redisConfig,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
        },
    });

    queue.on('error', (error) => {
        console.error(`Queue ${name} error:`, error);
    });

    return queue;
}

export { redisConfig };
