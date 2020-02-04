module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "es2017": true,
        "es2020": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module"
    },
    "rules": {
        //"quotes": ["double"]
    }
};
