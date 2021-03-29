# lambda-emfiles

A solution to node AWS lambda EMFILE issue. If you spot following errors in your lambda function logs:

1) getaddrinfo EMFILE
2) EMFILE, too many open files
3) with ioredis, Failed to refresh slots cache
4) with mongodb, MongoError: no connection available, MongoServerSelectionError

...

etc

Most likely, it is caused by exceeding the file descriptors limit of AWS lambda. 

lambda-emfiles provides solution to the problem.

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

1) report file descriptor leaks to help debug.
2) prevent it. if the file descriptors will reach the max limit in next run, it exits the process. 

# detail of the issue and solution

AWS lambda process runs within a docker container in Amazon Linux environment. The maximum limit on file descriptors is 1000. Normally, it is very hard for a lambda function to exceed the limit.

However, the lambda process within the container may be reused for performance optimization.

This is the reason for most cases of exceeding file descriptors limit. 

## Here is how it happens:

A lambda function leaks 100 file descriptors each time. It will hit the limit in abut 10 runs.

The chance that the lambda process is reused 10 times is really low. 

This is why the lambda runs OK for most of times. 

But you can spot few errors caused by exceeding file descriptors limit after a while, it depends on how frequently the lambda is running and the concurrency level of the lambda.

The best solution to the problem is to fix file descriptor leakage. lambda-emfiles provides report for this. 

It takes time to fix file descriptor leakage, specially it works most of times. 

Alternatively, lambda-emfiles calls process.exit(1) when it predicts a deficit of file descriptors in next run. Once the process is gone, it will not reused.

## Tunning of parameters: max_emfiles_needed and exit_process

The 2 public methods come with default values for max_emfiles_needed and exit_process. The default values should work for most scenarios.

<pre>
async start_verify(max_emfiles_needed = 100, exit_process = false)

async lambda_emfiles.final_check(max_emfiles_needed = 100, exit_process = true)
</pre>

max_emfiles_needed: is the estimated max file descriptors will open in the same time.

exit_process: if it is true, it instructs lambda-emfiles to call process.exit(1), when it sees a deficit of file descriptors.