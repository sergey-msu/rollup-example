import { create, toCanvas } from "qrcode";
import { TonhubConnector } from "ton-x";

console.log(create('4444'));
console.log(TonhubConnector);

toCanvas(document.getElementById("qrc-id"), "hello bundle", function (error) {
    if (error) console.error(error);
});
