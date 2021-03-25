'use strict';

const fs = require('fs');
const lambda_emfiles = require('@samwen/lambda-emfiles');

// eslint-disable-next-line no-unused-vars
exports.handler = async (event) => {
    console.log(event);
    let max_fds_needed = 100;
    if (event.max_fds_needed) {
        max_fds_needed = event.max_fds_needed;
    }
    let leaks = 100;
    if (event.leaks) {
        leaks = event.leaks;
    }
    try {
        await lambda_emfiles.start_verify(max_fds_needed);
        //
        // simulate file descriptor leaks 
        for (let i = 0;; i < leaks; i++) {
            const filename = '/tmp/test' + i + '.txt';
            fs.open(filename, 'w', (err, fd) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await lambda_emfiles.final_check(max_fds_needed);
    }
    return 'OK';
};

