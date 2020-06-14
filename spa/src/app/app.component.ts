import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as Enumerable from 'linq';
import * as dayjs from 'dayjs'
import { Dayjs } from 'dayjs';
import data from '../data/data.json';

type PR = {
  place: string,
  place_url: string,
  team: string,
  team_url: string,
  number: number,
  title: string,
  url: string,
  merged_at: Dayjs,
  updated_at: Dayjs,
  user_id: string,
  user_url: string,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'jamstack-sample-angular-node-spa';
  user = '';
  items = [];
  lastUpdateAt: Dayjs;
  latestOnly = true;

  get displayItems(): PR[] {
    if (this.latestOnly) {
      return Enumerable.from(this.items).distinct(pr => pr.team_url).toArray();
    } else {
      return this.items;
    }
  }

  get lastUpdateAtFormatted(): string {
    return this.lastUpdateAt?.format('YYYY/MM/DD HH:mm:ss') ?? '';
  }

  constructor(private http: HttpClient) {

  }

  ngOnInit() {
    this.user = data.user;
    this.items = data.data;
    this.lastUpdateAt = dayjs(data.last_update_at);
  }

  formatDate(value: Dayjs | string): string {
    if (typeof value === 'string') {
      return dayjs(value).format('YYYY/MM/DD HH:mm:ss');
    } else {
      return value.format('YYYY/MM/DD HH:mm:ss');
    }
  }
}
