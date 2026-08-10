// Entry point for --import: registers the "@/" resolver above.
import { register } from "node:module";
register("./alias-resolver.mjs", import.meta.url);
