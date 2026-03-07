// exit-with-param.ctl — receives an int parameter and uses it as the exit code.
// This lets the test verify that the value passed in actually comes back out.
//   WCCOActrl exit-with-param.ctl 42 -proj ... -n
//   → process exits with code 42
main(int code)
{
  exit(code);
}
