# lambda-emfiles

A solution to node AWS lambda EMFILE issue. If you spot following errors in your lambda function logs:

1) getaddrinfo EMFILE ...
2) with ioredis, Failed to refresh slots cache
3) with mongodb, MongoServerSelectionError
4) EMFILE, too many open files

...

etc

It most likely caused by exceeding the file descriptors limit of AWS lambda. lambda-emfiles provides solution to the problem.

# how to use

## install

npm install @samwen/lambda-emfiles

## in your lambda code

<pre>
const lambda_emfiles = require('@samwen/lambda-emfiles');

exports.handler = async (event) => {
    try {
        await lambda_emfiles.start_verify();
        ...
        your code
        ...
    } catch (err) {
        ...
        error handle code
        ...
    } finally {
        ...
        code to close and release resources
        ... 
        await lambda_emfiles.final_check();
    }
    return 'OK';
};

output by lambda_emfiles:

example 1:
*** new process, emfiles count: 23
...
...
*** emfiles count: 24, leaks: 1

example 2:
*** old process, emfiles count: 24
...
...
*** emfiles count: 33, leaks: 9

example 3:
*** old process, emfiles count: 890
...
...
*** emfiles count: 910, leaks: 20
Runtime exited with error: exit status 1 Runtime.ExitError
</pre>

# what does it do:

1) report file descriptor leakages to help find out file descriptor leakages
2) avoid the EMFILE issue by exiting the process, when it sees deficit of file descriptors.

# detail of the issue and solution

AWS lambda process runs within a docker container in Amazon Linux environment. The limit on file descriptors is 1000 maximum. Normally, it is very hard for a lambda function to exceeds the limit.

However, the container and the lambda process within container may be reused for performance optimization.

This is the reason for most cases of exceeding file descriptors limit. 

## Here is how it happens:

A lambda function leaks 10 file descriptors per run. It will hit the limit after 100 runs.

The chance that the lambda process is reused 100 times is really low. 

This is why the lambda runs OK for 99.9+% of times. 

But you can spot few errors caused by exceeding file descriptors limit after a while, it depends on how busy the lambda is running and the concurrency level of the lambda.

The best solution to the problem is to fix file descriptor leakage. lambda-emfiles provides leakages report for this. However, it takes time to fix file descriptor leakage, specially it works most of  times. 

The alternative approach is to exit the process before the file descriptors reach the max limit in next run. lambda-emfiles calls process.exit(1) when it predicts a deficit of file descriptors in next run.

## Tunning of parameters: max_emfiles_needed and exit_process

The 2 public methods comes with default values for max_emfiles_needed and exit_process. It should works for most scenarios.

<pre>
async start_verify(max_emfiles_needed = 100, exit_process = false)

async lambda_emfiles.final_check(max_emfiles_needed = 100, exit_process = true)
</pre>

max_emfiles_needed: is the estimated max file descriptors the lambda opens in the same time.

exit_process: if it is true, it instructs lambda-emfiles to call process.exit(1), when it sees a deficit of file descriptors.