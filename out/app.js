import { create, toCanvas } from "./bundle.js";
import { TonhubConnector } from "./bundle.js";


console.log(create('4444'));
console.log(TonhubConnector);
toCanvas(getElementById("qrc-id"), "hello bundle", function (error) {
    if (error) console.error(error);
});
