import axios from 'axios';
import Enumerable from 'linq';
import dayjs from 'dayjs'
import { Dayjs } from 'dayjs';
import { StringUtils } from './utils/string-utils';
import fs from 'fs-extra';
import Path from 'path';

type PR = {
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

export class CommandGenerate {
  private readonly user = 'microsoft';
  private readonly maxRepoCount = 10;
  private readonly maxPrCount = 100;
  private accessToken = '';

  async run(): Promise<number> {
    let code = 0;
    console.info(`${this.constructor.name}:: run start`);

    this.accessToken = process.env.GITHUB_TOKEN  ?? '';
    if (StringUtils.isEmpty(this.accessToken)) {
      code = -1;
      console.error(`${this.constructor.name}:: GITHUB_TOKEN  is not found.`);
      return code;
    }

    const repos = await this.loadRepos(this.user);

    let arr = Enumerable.empty<PR>();
    for (const repo of repos.toArray()) {
      console.info(`${this.constructor.name}:: ${repo} start`);
      try {
        const res = await this.loadPR(repo);
        arr = arr.merge(res);
      } catch (error) {
        console.warn(`${this.constructor.name}::error`, repo, error);
      }
      console.info(`${this.constructor.name}:: ${repo} finished`);
    }

    const items = arr
      .orderByDescending(x => x.updated_at)
      .toArray();

    const out = {
      last_update_at: dayjs().toISOString(),
      user: this.user,
      data: items
    };

    fs.writeFileSync(Path.resolve(__dirname, '../../spa/src/data/data.json'), JSON.stringify(out, null, '  '));
    console.info(`${this.constructor.name}:: run finished status = ${code}`);
    return code;
  }

  async loadRepos(user: string): Promise<Enumerable.IEnumerable<string>> {
    console.log(`${this.constructor.name}:: CommandGenerate -> loadRepos`, user);
    const config = {
      headers: {
        'Authorization': `token ${this.accessToken}`
      }
    };

    const results = await axios.get<any>(
      `https://api.github.com/users/${user}/repos?sort=pushed&page=1&per_page=${this.maxRepoCount}`,
      config);

    return Enumerable.from(results.data as any[]).select(repo => repo.full_name);
  }

  async loadPR(repo: string): Promise<Enumerable.IEnumerable<PR>> {

    const config = {
      headers: {
        'Authorization': `token ${this.accessToken}`
      }
    };

    const results = await axios.get<any>(
      `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&page=1&per_page=${this.maxPrCount}`,
      config);

    return Enumerable.from(results.data as any[]).select(pr => ({
      team: repo,
      team_url: `https://github.com/${repo}`,
      number: pr.number,
      title:  pr.title,
      url:  pr.html_url,
      merged_at: (pr.merged_at != null && pr.merged_at != '') ? dayjs(pr.merged_at) : null,
      updated_at: dayjs(pr.updated_at),
      user_id:  pr.user.login,
      user_url:  pr.user.html_url,
    } as PR));
  }

}
