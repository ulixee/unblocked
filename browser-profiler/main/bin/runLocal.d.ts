#!/usr/bin/env node
/**
 * Installation on a mac:
 *
 * crontab -e
 *
 * wake computer:
 * sudo pmset repeat wakeorpoweron MTWRFSU 06:00:00
 *
 * add an entry
 * 1 6 * * * cd $HOME/Projects/ulixee/unblocked/browser-profiler/build/ && npx runLocal
 */
import '@ulixee/commons/lib/SourceMapSupport';
