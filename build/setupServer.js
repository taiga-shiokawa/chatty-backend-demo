"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChattyServer = void 0;
// サードパーティ(外部のライブラリなど)モジュール
const express_1 = require("express");
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const cookie_session_1 = __importDefault(require("cookie-session"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
require("express-async-errors");
// ローカルモジュール
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const error_handler_1 = require("./shared/globals/helpers/error-handler");
const SERVER_PORT = 3000;
const log = config_1.config.createLogger('server');
class ChattyServer {
    constructor(app) {
        this.app = app;
    }
    start() {
        this.securityMiddleware(this.app);
        this.standardMiddleware(this.app);
        this.routesMiddleware(this.app);
        this.globalErrorHandler(this.app);
        this.startServer(this.app);
    }
    securityMiddleware(app) {
        app.use((0, cookie_session_1.default)({
            name: 'session',
            keys: [config_1.config.SECRET_KEY_ONE, config_1.config.SECRET_KEY_TWO],
            maxAge: 24 * 7 * 3600000,
            secure: config_1.config.NODE_ENV !== 'development'
        }));
        // 異なるドメインのリソースにアクセスするための仕組み
        app.use((0, cors_1.default)({
            origin: config_1.config.CLIENT_URL,
            credentials: false,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        }));
    }
    standardMiddleware(app) {
        app.use((0, compression_1.default)());
        app.use((0, express_1.json)({ limit: '50mb' }));
        app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb ' }));
    }
    routesMiddleware(app) {
        (0, routes_1.default)(app);
    }
    globalErrorHandler(app) {
        app.all('*', (req, res) => {
            res.status(http_status_codes_1.default.NOT_FOUND).json({ message: `${req.originalUrl} not found` });
        });
        const errorHandler = (err, _req, res, next) => {
            log.error(err);
            if (err instanceof error_handler_1.CustomError) {
                res.status(err.statusCode).json(err.serializeErrors());
            }
            else {
                res.status(http_status_codes_1.default.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
            }
            next(err);
        };
        app.use(errorHandler);
    }
    startServer(app) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const httpServer = new http_1.default.Server(app);
                const socketIO = yield this.createSocketIO(httpServer);
                this.startHttpServer(httpServer);
                this.socketIOConnections(socketIO);
            }
            catch (error) {
                log.error(error);
            }
        });
    }
    createSocketIO(httpServer) {
        return __awaiter(this, void 0, void 0, function* () {
            const io = new socket_io_1.Server(httpServer, {
                cors: {
                    origin: config_1.config.CLIENT_URL,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
                }
            });
            const pubClient = (0, redis_1.createClient)({ url: config_1.config.REDIS_HOST });
            const subClient = pubClient.duplicate();
            yield Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            return io;
        });
    }
    startHttpServer(httpServer) {
        log.info(`サーバーがプロセス ${process.pid} で起動しました`);
        httpServer.listen(SERVER_PORT, () => {
            log.info(`ポート番号：${SERVER_PORT}で起動中....`);
        });
    }
    socketIOConnections(io) { }
}
exports.ChattyServer = ChattyServer;
//# sourceMappingURL=setupServer.js.map