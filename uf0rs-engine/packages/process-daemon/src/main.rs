fn main() {
    if let Err(error) = uf0rs_pty::client::run_cli() {
        eprintln!("error: {error:#}");
        std::process::exit(1);
    }
}
