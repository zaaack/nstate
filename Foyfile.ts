import { task, setGlobalOptions, option, fs } from 'foy'

setGlobalOptions({ loading: false, strict: true })

task('build', async (ctx) => {
  await fs.rmrf('./esm')
  await fs.rmrf('./cjs')
  await Promise.all([ctx.exec('tsc'), ctx.exec('tsc -m esnext --outDir esm')])
})

task('test', async (ctx) => {
  console.log('test')
  await ctx.exec(`jasmine --require=ts-node/register "./src/test/**.test.ts"`)
})

option('-t, --type <val>', 'type', { default: 'patch' })
task<{ type: string }>('publish', async (ctx) => {
  await ctx.exec([
    `npm version ${ctx.options.type || 'patch'}`,
    'npm publish --registry=https://registry.npmjs.org/ --access public',
  ])
})
