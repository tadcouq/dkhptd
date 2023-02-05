import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { PublicApi } from "src/apis/public.api";
import { Session } from "src/repositories/is-authorized.repo";
import { CookieUtils } from "src/utils/cookie.utils";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"]
})
export class LoginComponent {
  username = "";
  password = "";
  message?: string;

  constructor(
    private publicApi: PublicApi,
    private cookieUtils: CookieUtils,
    private session: Session,
    private router: Router
  ) { }

  login() {
    this.publicApi.login(this.username, this.password).subscribe((res) => {
      if (res.success) {
        this.cookieUtils.set({ name: "jwt", value: res.data?.token });
        this.session.authenticated(res.data);
        this.router.navigate(["/term-ids"]);
      }
    });
  }

  onKeyPress(e: KeyboardEvent) {
    if (e.key == "Enter") {
      this.login();
    }
  }
}
