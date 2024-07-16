# Unblocked Web

This project maintains a suite of tools for protecting the web's open knowledge. Its primary function is to create a web-scraping engine that mimics a human interacting with a website - both from a user behavior, as well as from a "browser" perspective.

## Using this Repository

This is a Monorepo to work on the Browser Detect + Evade workflow of building an automated engine. It requires Yarn workspaces. 

You can work with the project by:
1. Cloning the repository and installing git submodules (you can add --recursive to your initial clone request).
2. Run `yarn build`. NOTE: you must run this command to build typescript files.

### Browser Profiles

If you want to work with profiles (ie, update Emulator Data, generate Double Agent probes, etc), you'll need to download the BrowserProfiles data: `$ yarn workspace @ulixee/unblocked-browser-profiler downloadData`. This will clone data into a folder called `browser-profile-data` adjacent to the `unblocked` folder.


## Questions

Join us on the [Ulixee Discord](https://discord.gg/tMAycnemHU) for any questions or comments (it's a sister project). 

## Projects

This repository is home to several of the projects needed to create an "unblocked" automated browser engine. We imagine a world where there are many participants sharing evasions and emulations for all the web features into a [single repository](./plugins). They will live right next to an advanced bot blocking [detection engine][double-agent] that can analyze every facet of a web scraping session (TCP, TLS, HTTP, DOM, User Interactions, etc). A [profiler](./browser-profiler) that can run all [detections][double-agent] using real browser/operating systems to generate [profiles][profiles] of true browser signatures. And an implementation of an [agent][agent] that can run all the evasions and run unblocked.

- [Specifications][spec]. This contains generic specifications for what an automated browser needs to expose so that it can be hooked into to emulate a normal, headed browser engine. To properly mask the differences between headless Chrome on a linux machine, and a headed Chrome running on a home operating system, a series of "hooks" needs to be exposed. These include things like before browsers start, web pages launch, and web workers have a javascript environment. This specification will be the minimum spec needed to open up the browser to plugin authors.
- [JsPath][jspath]. A specification is provided for a method to serialize DOM nodes, properties and visibility information so it can be remotely queried.
- [Agent][agent]. A basic automated engine that implements the full reference [Specifications][spec].
- [Plugins](./plugins). Unblocked community plugins that enhance a browser to mask Browser, Network, User Interaction and Operating System "markers" that can be used to block web scrapers.
- [DoubleAgent][double-agent]. A series of tests that can be run to analyze real Browsers on real machines, and then compare all the detected markers to an automated setup.
- [DoubleAgent Stacks](./double-agent-stacks). Runners for common scraper stacks. This can also serve as a workflow example for your own stack.
- [Real User Agents][real-user-agents]. A library that collects real Chromium releases and UserAgent strings collected from real browsers. This is used to generate UserAgent strings for various combinations of Browsers and Operating Systems.
- [Browser Profile Data][profiles]. A data repository containing profiles of real browsers using BrowserStack, Dockers and Local Doms. Includes deep diffing various environments of Chrome (headed, headless, with devtools, browserstack, between runs, etc).
- [Browser Profiler](./browser-profiler). Profiler to automatically collect [Browser Profile Data][profiles]. Automation to recreate files is driven from Profile Data project.
- [Emulator Builder](./browser-emulator-builder). A library to use the collected data from Browser Profile Data to "patch" runtime headless Chrome to match headed Chrome on a home Operating System.
- [Mission Impossible](./mission-impossible). Real world measurement of what DOM Apis are being analyzed on the top websites, and how many are detecting and blocking the Unblocked Agent + Community Plugins. _To be imported_

## Contributing

We'd love your help improving Unblocked tools. Please don't hesitate to send a pull request. The best starting place is to add an evasion to the Unblocked [Plugins](./plugins) or to add detections to [DoubleAgent][double-agent].

All `Unblocked` projects use eslint for code standards and ensure lint + test are run before allowing any pushes. 

This project has a [code of conduct](CODE_OF_CONDUCT.md). By interacting with this repository, organization, or community you agree to abide by its terms.


## License

[MIT](LICENSE.md)

[agent]: ./agent
[double-agent]: ./double-agent
[spec]: ./specification
[jspath]: ./jspath
[profiles]: https://github.com/ulixee/browser-profile-data
[real-user-agents]: ./real-user-agents
