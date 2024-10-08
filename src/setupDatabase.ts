import mongoose from 'mongoose';
import { config } from './config';
import Logger from 'bunyan';

const log: Logger = config.createLogger('setupDatabase');

export default () => {
  const connect = () => {
    mongoose
      .connect(`${config.DATABASE_URL}`)
      .then(() => {
        log.info('DB接続成功');
      })
      .catch((error) => {
        log.info('DB接続失敗', error);
        return process.exit(1);
      });
  };
  connect();

  mongoose.connection.on('DB接続が切断されました', connect);
};
