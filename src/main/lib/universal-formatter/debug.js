// debug.js
async function test() {
    try {
        const prettier = await import('prettier');
        const javaPluginReq = require('prettier-plugin-java');
        const javaPlugin = javaPluginReq.default || javaPluginReq;
        
        console.log("1. Prettier Version:", prettier.version || prettier.default.version);
        console.log("2. Java Plugin Loaded:", !!javaPlugin);
        console.log("3. Java Plugin Keys:", Object.keys(javaPlugin)); // 这里必须包含 'languages' 和 'parsers'

        const code = "public class test{public static void main(String[] args){System.out.println(\"Hi\");}}";
        const res = await prettier.format(code, {
            parser: 'java',
            plugins: [javaPlugin]
        });
        console.log("\n✅ Success! Formatted Output:\n", res);
    } catch (e) {
        console.error("\n❌ Error:", e);
    }
}
test();