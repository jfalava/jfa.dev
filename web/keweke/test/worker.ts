export { KewekeList } from "../src/server/keweke-list";
export { KewekeAliasDirectory } from "../src/server/keweke-aliases";

export default {
  fetch() {
    return new Response("keweke test worker");
  },
};
