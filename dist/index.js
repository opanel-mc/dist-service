"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const app = (0, app_1.createApp)();
app.listen(PORT, () => {
    console.log(`dist-service listening on port ${PORT}`);
});
