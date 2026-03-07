// with-params.ctl — accepts two string parameters via main() signature
// WinCC OA CTRL maps positional args to main() parameters in declaration order:
//   WCCOActrl script.ctl hello world -proj ...
//   → p1 = "hello", p2 = "world"
main(string p1, string p2)
{
  exit(0);
}
