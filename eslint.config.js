const pluginTslint = require("@typescript-eslint/eslint-plugin");
const pluginStylistic = require("@stylistic/eslint-plugin");
const pluginImport = require("eslint-plugin-import");
const { fixupPluginRules } = require("@eslint/compat");
const tsParser = require("@typescript-eslint/parser");
const yamlParser = require("yaml-eslint-parser");
const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = [
    {
        ignores: ["src/model/schema/*", "examples/*", "**/**.js"],
    },
    ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),
    {
        plugins: {
            "@typescript-eslint": pluginTslint,
            "@stylistic": pluginStylistic,
            import: fixupPluginRules(pluginImport),
        },
    
        languageOptions: {
            globals: {},
            parser: tsParser,
            ecmaVersion: 12,
            sourceType: "module",
    
            parserOptions: {
                tsconfigRootDir: "./",
                project: ["./tsconfig.json"],
            },
        },
    
        rules: {
            "import/order": ["warn", {
                "newlines-between": "always",
    
                alphabetize: {
                    order: "asc",
                    caseInsensitive: false,
                },
    
                pathGroups: [{
                    pattern: "../**",
                    group: "sibling",
                }],
    
                pathGroupsExcludedImportTypes: [],
            }],
    
            "accessor-pairs": ["warn", {
                setWithoutGet: true,
                enforceForClassMembers: true,
            }],
    
            "array-bracket-spacing": ["warn", "always", {
                objectsInArrays: false,
                arraysInArrays: false,
            }],
    
            "arrow-spacing": "warn",
            "comma-style": "warn",
            "eol-last": ["warn", "always"],
            "func-call-spacing": "warn",
            "grouped-accessor-pairs": ["warn", "getBeforeSet"],
    
            "key-spacing": ["warn", {
                beforeColon: false,
                afterColon: true,
                mode: "strict",
            }],
    
            "lines-between-class-members": ["warn", "always", {
                exceptAfterSingleLine: true,
            }],
    
            "no-alert": "warn",
            "no-empty": "warn",
            "no-multi-spaces": "warn",
    
            "no-multiple-empty-lines": ["warn", {
                max: 1,
                maxEOF: 0,
                maxBOF: 0,
            }],
    
            "no-negated-condition": "warn",
    
            "no-trailing-spaces": ["warn", {
                skipBlankLines: true,
            }],
    
            "no-useless-concat": "warn",
            "no-useless-return": "warn",
            "no-whitespace-before-property": "warn",
            "object-curly-spacing": ["warn", "always"],
            "object-shorthand": "warn",
            "operator-linebreak": ["warn", "before"],
            "padded-blocks": ["warn", "never"],
            "prefer-const": "warn",
    
            "semi-spacing": ["warn", {
                before: false,
                after: true,
            }],
    
            "semi-style": "warn",
            "space-before-blocks": "warn",
    
            "space-before-function-paren": ["warn", {
                anonymous: "always",
                named: "never",
                asyncArrow: "always",
            }],
    
            "space-in-parens": "warn",
            "space-infix-ops": "warn",
            "spaced-comment": ["warn", "always"],
            "switch-colon-spacing": "warn",
            "template-curly-spacing": "warn",
            yoda: "warn",
            "arrow-parens": "error",
            "comma-dangle": ["error", "never"],
            curly: "error",
            "default-case": "error",
            "default-case-last": "error",
            eqeqeq: "error",
            "init-declarations": "error",
            "no-caller": "error",
            "no-constructor-return": "error",
            "no-extend-native": "error",
            "no-floating-decimal": "error",
            "no-implicit-coercion": "error",
            "no-labels": "error",
            "no-multi-assign": "error",
            "no-new": "error",
            "no-new-func": "error",
            "no-new-object": "error",
            "no-new-wrappers": "error",
            "no-param-reassign": "error",
            "no-plusplus": "error",
    
            "no-restricted-syntax": ["error", {
                selector: "BinaryExpression[operator=\"**\"]",
                message: "Unexpected exponential operator, use Math.pow instead.",
            }, "UnaryExpression[operator=\"delete\"]", "DoWhileStatement", "ForInStatement", "ForStatement"],
    
            "no-sequences": "error",
            "no-template-curly-in-string": "error",
            "no-throw-literal": "error",
    
            "no-unneeded-ternary": ["error", {
                defaultAssignment: false,
            }],
    
            "one-var": ["error", "never"],
            "prefer-arrow-callback": "error",
            "prefer-object-spread": "error",
            "prefer-promise-reject-errors": "error",
            "prefer-regex-literals": "error",
            "prefer-template": "error",
            "quote-props": ["error", "consistent"],
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-explicit-any": "warn",
            "@stylistic/indent": ["warn", 2],
            "linebreak-style": ["error", "unix"],
            quotes: ["error", "double"],
            semi: ["error", "always"],
        },
    },
    ...compat.extends("plugin:yml/standard").map(config => ({
        ...config,
        files: ["**/*.yaml", "**/*.yml"],
    })),
    {
        files: ["**/*.yaml", "**/*.yml"],
    
        languageOptions: {
            parser: yamlParser,
        },
    }
];