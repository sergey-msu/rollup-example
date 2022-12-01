import { abc, def } from "./bundle.js";
import { QRCode } from "./bundle.js";

console.log(abc());
console.log(def());

QRCode.toCanvas(id("qrc-id"), "hello bundle", function (error) {
    if (error) console.error(error);
});
