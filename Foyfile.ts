import { task, setGlobalOptions, option } from 'foy'

setGlobalOptions({ loading: false, strict: true })

task('build', async (ctx) => {
  await Promise.all([ctx.exec('tsc'), ctx.exec('tsc -m esnext --outDir es')])
})

task('test', async (ctx) => {
  console.log('test')
  await ctx.exec(`jasmine --require=ts-node/register "./src/test/**.test.ts"`)
})

option('-t, --type <val>', 'type', { default: 'patch' })
task<{ type: string }>('publish', async (ctx) => {
  await ctx.exec([
    'foy test',
    'foy build',
    `npm version ${ctx.options.type || 'patch'}`,
    'npm publish --registry=https://registry.npmjs.org/ --access public',
    'git push origin master --tags',
  ])
})
