## Test methodology
***
Each phase is tested successively in a dedicated context.
For each phase, the following tests are performed :
* has correct WorkflowStatus
* can do what is supposed to 
* cannot do what is supposed to
* emits the appropriate event

An *after* hook set after each context allows to skip to the next status.
The *tally* process is tested to elect the right winner.

## Pass the tests
***
To pass the test, use the following command :
```
$ truffle test
```
