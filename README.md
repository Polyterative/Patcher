![image](https://github.com/user-attachments/assets/aeb72af3-8e20-44f5-aad8-2ca547251532)
![My_collection__patcher xyz_-_Google_Chrome__2024-10-29_00-43](https://github.com/user-attachments/assets/68635b4f-7ae8-4841-8356-7b7720d89e97)

<br>
<br>

<h1 align="center">
  <a href="https://polyterative.notion.site/7139ace262ad48a59e560bff76722a63?v=756abbb3f1494894a2a0f6f53bc7e8e1" target="_blank">PROJECT ROADMAP</a>
</h1>

<br>

<p align="center">
  This roadmap provides a clear view of the project's ongoing developments, including bug fixes, feature requests, future enhancements, and budget tracking. Here, you'll find the most up-to-date information on what we're working on and what’s planned for the future.
</p>

<br>
<br>

---

<br>

### FOR USERS: HOW TO REQUEST NEW FEATURES OR REPORT BUGS

If you’re a user with a new feature request or bug report, please check the <a href="https://polyterative.notion.site/7139ace262ad48a59e560bff76722a63?v=756abbb3f1494894a2a0f6f53bc7e8e1" target="_blank">Project Roadmap</a> first, as your request may already be in progress or planned.

If you don’t see your issue listed, feel free to open a new issue on GitHub to let us know.

<br>
<br>


## **Table of Contents**

1. [**Introduction**](#introduction)
2. [**Setting Up the Project Locally**](#setting-up-the-project-locally)
3. [**Using the Project**](#using-the-project)
4. [**Project Dependencies**](#project-dependencies)
5. [**DB Model Details**](#db-model-details)
6. [**Pull Requests**](#pull-requests)
7. [**License**](#license)

---

## **Introduction**

**Patcher** is designed to assist with Eurorack setups, providing a modern interface and robust functionality.

The project's mission is to build a complete management system for all the needs of artists who use modular equipment. Priorities include ease and speed of use, aesthetic cleanliness, and correctness of data.

Another goal of the project is to build a database that is publicly accessible and this may include an API, possibly developed in the future. Modules' data will never be restricted by a paywall and will always be publicly accessible.

The project is open-source and contributions are welcome.

---

## **Setting Up the Project Locally**

To set up the project locally, follow the steps below:

1. **Clone** the repository to your local machine using `git clone <repository_url>`.
2. **Navigate** to the project directory using `cd Patcher`.
3. **Install** the necessary dependencies using `yarn install`.  
   **Note:** We use **Yarn** as our package manager. Please do not generate a `package-lock.json` file.
4. **Run** `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

---

## **Using the Project**

The `develop` branch is where the code gets advanced. The `production` branch gets directly uploaded via automated tools. Be aware of this when navigating the project.

To use the project's features, navigate to the appropriate section of the interface and follow the prompts. If you encounter any issues, refer to the documentation or raise an issue on GitHub.

---

## **Project Dependencies**

The project uses the following tools and libraries:

| **Tool/Library**       | **What**                                                             |
|------------------------|----------------------------------------------------------------------|
| **Angular**            | Web framework. Using v18                                             |
| **Angular Material**   | UI components                                                        |
| **Supabase**           | Database, authentication, and storage                                |
| **Vercel**             | Deployment, hosting                                                  |
| **GitHub**             | Version control, issue tracking, project management, test automation |
| **Database**           | PostgreSQL hosted on Supabase                                        |
| **Sentry**             | Technical analytics and error tracking                               |
| **Other Dependencies** | Check the `package.json` file                                        |

---

## **DB Model Details**

The database model for the project is as follows:

![Database Model](https://user-images.githubusercontent.com/16295552/155419090-3e3a0cd6-77b9-4d3b-91be-d525ef43dd03.png)

---

## **Pull Requests**

If you have forked on **GitHub**, then the best way to submit your patches is to push your changes back to GitHub and then send a "pull request" on GitHub.

If your pull request is small, for example, one or two commits each containing only a few lines of code, then it is easy for the maintainers to review.

If you are creating a larger pull request, then please help the maintainers by making the reviews as straightforward as possible:

- The smaller the PR, the easier it is to review. In particular, if a PR is too large to review in one sitting, or if changes are requested, then the maintainer needs to repeatedly re-read code that has already been considered.
- If you are creating a large pull request, then please consider splitting your pull request into multiple PRs. If part of your work can be considered standalone, or is a foundation for the rest of your work, please submit it separately first.

---

## **License**

This project is licensed under the **GNU Affero General Public License v3.0**. For more information, see the [LICENSE](LICENSE.txt) file.
