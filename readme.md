# lambda-emfiles

A solution to node AWS lambda EMFILE issue. If you spot following errors in your lambda function logs:

1) getaddrinfo EMFILE ...
2) with ioredis, Failed to refresh slots cache
3) with mongodb, MongoServerSelectionError
4) EMFILE, too many open files
...
etc

It most likely caused by exceeding file descriptors limit of AWS lambda. lambda-emfiles provides solution to the problem.

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
</pre>

example 3:
*** old process, emfiles count: 890
...
...
*** emfiles count: 910, leaks: 20
Runtime exited with error: exit status 1 Runtime.ExitError
</pre>

# what does it do:

1) report file descriptor leakages to help find out file descriptor leakages
2) prevent running into exceeding file descriptors limit of AWS lambda.

# detail of the issue and solution

AWS lambda process runs within a docker container in Amazon Linux environment. There are limits on the lambda process. One of the limits is 1000 maximum file descriptors. Ideally, it is very hard for a lambda function to exceeds the limit.

For the purpose of performance, AWS lambda container and the lambda process within the container may be reused. 

It is the reason of most cases of exceeding file descriptors limit. 

## Here is how it happens:

There is a lambda function. It leaks 10 file descriptors per run. It will hit the limit after 100 runs.

The chance that the lambda process is reused 100 times is really low. 

This is why the lambda runs OK for 99.9+% of times. 

But you can spot few errors caused by exceeding file descriptors limit after a while, it depends on how busy the lambda is running and the concurrency level of the lambda.

The best approach is to fix file descriptor leakage. It takes time to fix file descriptor leakage, specially it works 99.9+% times. 

The alternative is to call process.exit to cleanup the process before the file descriptors reach the max limit in next run.

