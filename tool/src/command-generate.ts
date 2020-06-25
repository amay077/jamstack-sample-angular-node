import axios from 'axios';
import Enumerable from 'linq';
import dayjs from 'dayjs'
import { Dayjs } from 'dayjs';
import { StringUtils } from './utils/string-utils';
import fs from 'fs-extra';
import Path from 'path';

type Repo = {
  name: string,
  stars: number,
}

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
  stars: number,
}

export class CommandGenerate {
  private readonly user = 'mapbox';
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
      console.info(`${this.constructor.name}:: ${repo.name} start`);
      try {
        const res = await this.loadPR(repo);
        arr = arr.merge(res);
      } catch (error) {
        console.warn(`${this.constructor.name}::error`, repo.name, error);
      }
      console.info(`${this.constructor.name}:: ${repo.name} finished`);
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

  async loadRepos(user: string): Promise<Enumerable.IEnumerable<Repo>> {
    console.log(`${this.constructor.name}:: CommandGenerate -> loadRepos`, user);
    const config = {
      headers: {
        'Authorization': `token ${this.accessToken}`
      }
    };

    const results = await axios.get<any>(
      `https://api.github.com/users/${user}/repos?sort=pushed&page=1&per_page=${this.maxRepoCount}`,
      config);

    return Enumerable.from(results.data as any[]).select(repo => ({ name: repo.full_name, stars: repo.stargazers_count }));
  }

  async loadPR(repo: Repo): Promise<Enumerable.IEnumerable<PR>> {

    const config = {
      headers: {
        'Authorization': `token ${this.accessToken}`
      }
    };

    const results = await axios.get<any>(
      `https://api.github.com/repos/${repo.name}/pulls?state=closed&sort=updated&direction=desc&page=1&per_page=${this.maxPrCount}`,
      config);

    return Enumerable.from(results.data as any[]).select(pr => ({
      team: repo.name,
      team_url: `https://github.com/${repo.name}`,
      stars: repo.stars,
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
