import { Component, OnInit } from "@angular/core";
import { AccountsPreferencesApi } from "src/apis/accounts-preferences.api";
import AccountPreference from "src/entities/AccountPreference";

@Component({
  selector: "app-preferences",
  templateUrl: "./preferences.component.html",
  styleUrls: ["./preferences.component.scss"]
})
export class PreferencesComponent implements OnInit {
  preferences?: AccountPreference[];
  newPreference: AccountPreference = new AccountPreference({ wantedSubjectIds: [] });
  message?: string;

  constructor(private api: AccountsPreferencesApi) { }

  ngOnInit(): void {
    this.api.currentPreferences().subscribe(res => {
      if (res.success) {
        this.preferences = res.data;
      }
    });
  }

  addPreference() {
    this.api.addPreference(this.newPreference).subscribe(res => {
      this.message = res.success ? "SUCCESS" : res.message;
      this.ngOnInit();
    });
  }
}
