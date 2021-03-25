'use strict';

const { exec } = require('child_process');

class LambdaEmfiles {

    constructor() {
        this.is_new = true;
        this.emfiles_count = 0;
        this.max_leaks = 0;
    }

    /**
     * public
     * 
     * @param {*} max_emfiles_needed estimated max file descriptors are needed
     * @param {*} exit_process to exit the running process if not ok
     * @returns 
     */
    async start_verify(max_emfiles_needed = 100, exit_process = false) {
        if (!await this.__update_lambda_emfiles_count()) {
            console.log(`*** ${this.is_new ? 'new' : 'old'} process, NOT OK`);
        } else {
            console.log(`*** ${this.is_new ? 'new' : 'old'} process, emfiles count: ${this.emfiles_count}`);
        }
        this.is_new = false;
        if (exit_process && (!this.is_ok || 1000 - this.emfiles_count < max_emfiles_needed)) {
            process.exit(1);
        }
        return this.is_ok;
    }

    /**
     * public
     * *
     * @param {*} max_emfiles_needed estimated max file descriptors are needed
     * @param {*} exit_process to exit the running process if not ok
     *
     */
    async final_check(max_emfiles_needed = 100, exit_process = true) {
        const emfiles_count = this.emfiles_count;
        if (await this.__update_lambda_emfiles_count()) {
            if (this.emfiles_count > emfiles_count) {
                const leaks = this.emfiles_count - emfiles_count;
                if (leaks > this.max_leaks) {
                    this.max_leaks = leaks;
                }
                console.log(`*** emfiles count: ${this.emfiles_count}, leaks: ${leaks}`);
            } else {
                console.log('*** no leak emfiles found');
            }
        } else {
            console.log('*** process, NOT OK');
        }
        if (exit_process) {
            if (max_emfiles_needed < this.max_leaks) {
                max_emfiles_needed = this.max_leaks;
            }
            if (!this.is_ok || 1000 - this.emfiles_count < max_emfiles_needed) {
                process.exit(1);
            }
        }
    }

    /**
     * private implementation
     */
    __update_lambda_emfiles_count() {
        this.is_ok = true;
        return new Promise(resolve => {
            exec(`ls /proc/${process.pid}/fd`, (err, stdout, stderr) => {
                if (err || stderr) {
                    this.is_ok = false;
                    resolve(this.is_ok);
                } else {
                    const parts = stdout.split('\n');
                    this.emfiles_count = parts.length - 1;
                    resolve(this.is_ok);
                }
            });
        });
    }
}

module.exports = new LambdaEmfiles();