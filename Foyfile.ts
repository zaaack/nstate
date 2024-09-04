import { task, setGlobalOptions, option, fs } from 'foy'

setGlobalOptions({ loading: false, strict: true })

task('build', async (ctx) => {
  await fs.rmrf('./esm')
  await fs.rmrf('./cjs')
  await Promise.all([ctx.exec('tsc --outDir cjs'), ctx.exec('tsc -m esnext --outDir esm')])
})

task('test', async (ctx) => {
  console.log('test')
  await ctx.exec(`tsx --test ./src/test`)
})

option('-t, --type <val>', 'type', { default: 'patch' })
task<{ type: string }>('publish',['test'.async(), 'build'.async()], async (ctx) => {
  await ctx.exec([
    `npm version ${ctx.options.type || 'patch'}`,
    'npm publish --registry=https://registry.npmjs.org/ --access public',
  ])
})
