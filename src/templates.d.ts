// Doc templates are inlined as strings at build time.
declare module "*.hbs" {
  const content: string;
  export default content;
}
