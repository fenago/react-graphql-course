
Continuous Deployment with CircleCI and Heroku
==============================================

In the last two chapters, we prepared our application through tests with
Mocha and added detailed reporting of our GraphQL API by introducing
Apollo Engine. We have built an application that is ready for the
production environment.

We will now generate a production build that\'s ready for deployment.
We\'ve arrived at the point where we can set up our Heroku app and
implement the ability to build and deploy Docker images through a
continuous deployment workflow.

This lab covers the following topics:

-   Production-ready bundling
-   What is Docker?
-   What is continuous integration/deployment?
-   Configuring Docker
-   Setting up continuous deployment with CircleCI
-   Deploying our application to Heroku


Preparing the final production build
====================================

We have come a long way to get here. Now is the time where we should
take a look at how we currently run our application, and how we should
prepare it for a production environment.

Currently, we use our application in a development environment while
working on it. It is not highly optimized for performance or low
bandwidth usage. We include developer functionalities with the code so
that we can debug it properly. We also only generate one bundle, which
is distributed at all times. No matter which page the user visits, the
code for our entire application is sent to the user or browser.

For use in a real production environment, we should solve these issues.
When setting the [NODE\_ENV] variable to [production], we
remove most of the unnecessary development mechanics. Still, it would be
great to send as little code to the user as possible to save bandwidth.
We will take a look at this problem in the next section.



Code-splitting with React Loadable and webpack
----------------------------------------------

The best option to increase the efficiency of our application is to
introduce code-splitting to our React code. It allows us to send the
user only the parts of our code that are needed to view or render the
current page. Everything else is excluded, and will be dynamically
fetched from the server while the user navigates through our
application. The aim of this section is to generate a bundle that\'s
specific to every page or component that we use.

We will begin by installing a few packages that we need to implement
this technique. Install them using npm, as follows:

```
npm install --save-dev @babel/plugin-syntax-dynamic-import babel-plugin-dynamic-import-node webpack-node-externals @babel/plugin-transform-runtime
npm install --save react-loadable
```


Let\'s go through them one by one, in order to understand the purpose of
each package:

-   The [\@babel/plugin-syntax-dynamic-import] package allows you
    to transpile dynamic import syntax using Babel.
-   The [babel-plugin-dynamic-import-node] package implements the
    same functionality as the previous package, but is specifically
    targeted at Node.js.
-   The [webpack-node-externals] package gives you the option to
    exclude specific modules while bundling your application with
    webpack. It reduces the final bundle size.
-   The [\@babel/plugin-transform-runtime] package is a small
    plugin that enables us to reuse Babel\'s helper methods, which
    usually get inserted into every processed file. It reduces the final
    bundle size by that.
-   The [react-loadable] package is the only package that we do
    not install in our [devDependencies]. The reason is that our
    front end (and also the back end) will rely on it to dynamically
    import our React components.

You will soon learn why we need all of these packages.

The first package that we are going to use is the [react-loadable]
package, as it is the central point around which we will adjust our
front end and back end.

To allow for the dynamic import of React components, it makes sense to
take a look at our current React Router code. Open the [router.js]
file in the [client] folder. At the top of the file, you\'ll see
that we directly import all components of our application. However,
React Router only renders one of them at a time, as specified by our
routes. We will improve this procedure by introducing React Loadable
here, in order to load the one component that is required.

Aside from React and React Router, you can replace all [import]
statements at the top of the file with the following code:

```
import loadable from 'react-loadable';
import Loading from './components/loading';
const User = loadable({
  loader: () => import('./User'),
  loading: Loading,
});
const Main = loadable({
  loader: () => import('./Main'),
  loading: Loading,
});
const LoginRegisterForm = loadable({
  loader: () => import('./components/loginregister'),
  loading: Loading,
});
```


We import the [react-loadable] package in the preceding code.
Using the [loadable] HoC, we can dynamically load a component
before rendering it. This allows us to asynchronously import the
components, whereas our earlier approach was to directly load all of the
components synchronously, without the need for all of them.

We implement this solution for all of the main pages, which are the
[User], the [Main] (the news feed), and the
[LoginRegisterForm] components. The [loadable] HoC receives
the import statement as an executable function that returns a promise.
Until the promise is resolved, the [loading] property is
rendering, which is the [Loading] component that we already use
when a request ongoing. Instead of using the standard [import \... from
\...] syntax, we directly pass the filename to load as a
parameter. The result of each [loadable] HoC is saved in a
variable that matches the component names in the following
[Routing] class.

Now that we have set up [react-loadable] properly, we can adjust
the webpack configuration that generates the production build for the
front end code. Open the [webpack.client.build.config.js] file.
Our production build currently creates one big [bundle.js] file
that includes all of our front end code at once. We will change this and
split the bundle into multiple small chunks. These will be loaded by
React Loadable at the time of rendering a specific component.

Edit the [output] property of the webpack configuration to include
the [chunkFilename] field, as follows:

```
output: {
  path: path.join(__dirname, outputDirectory),
  filename: "bundle.js",
  publicPath: '/',
  chunkFilename: '[name].[chunkhash].js'
},
```


The [chunkFilename] field defines how the name of a non-entry
chunk file is built. Those files implement specific features, and are
not root files from which our application can be started. The preceding
code specifies that all chunks are named after the module name of the
chunk, following a hash of the chunk content.

To make use of React Loadable, we rely on the
[ReactLoadablePlugin] that it provides. Import the following
plugin at the top of the file:

```
const { ReactLoadablePlugin } = require('react-loadable/webpack');
```


Since we are using SSR with our application, we can remove the part
where we insert our bundle and other files in the HTML template by using
the [HtmlWebpackPlugin]. We are going to replace it with the
preceding [ReactLoadablePlugin]. Insert the following code,
instead of the [HtmlWebpackPlugin]:

```
new ReactLoadablePlugin({
  filename: './dist/react-loadable.json',
}),
```


The [ReactLoadablePlugin] stores all of the information about the
bundles that we are going to generate in a JSON file. This file is based
on the dynamically imported components that we use in our front end
code. This includes information on what modules are found in each
bundle. You will learn what we will use this JSON file for later on.

For an application that is not server-rendered, this setup would be
almost everything that you have to do. Because we use SSR, we have to
adjust our back end to fulfill all of the requirements when using
code-splitting for our entire application.



Code-splitting with SSR
-----------------------

When rendering our application on the server, we have to tell the client
which bundles to download on the initial page load. Open the server\'s
[index.js] file to implement this logic. Import the
[react-loadable] dependencies at the top of the file, as follows:

```
import Loadable, { Capture } from 'react-loadable';
import { getBundles } from 'react-loadable/webpack';
```


We import the [Loadable] module itself, but also the
[Capture] module. The last one is rendered along with your
server-rendered application to collect all modules or components that
were rendered for the current route that the user is visiting. It allows
us to include those bundles along with the initial HTML that our server
returns. To let our back end know which bundles exist, we load the
previously generated JSON file with the following code. Insert it
directly underneath the [import] statements:

```
if(process.env.NODE_ENV !== 'development') {
  var stats = require('../../dist/react-loadable.json');
}
```


The preceding code loads the [react-loadable.json] file if we are
in a production environment. In this case, we can expect that it will be
saved in the [dist] folder of our application. When using
[react-loadable] for server-side rendering, we have to ensure that
all dynamically loadable components are loaded before any of them are
rendered. There is a [preloadAll] method that the [Loadable]
module provides, which can load all of the modules before starting the
server for us. Replace the [server.listen] method call in the
services [for] loop with the following code:

```
Loadable.preloadAll().then(() => {
  server.listen(process.env.PORT? process.env.PORT:8000, () => {
    console.log('Listening on port '+(process.env.PORT? 
    process.env.PORT:8000)+'!');
    services[name](server);
  });
});
```


As you should have noticed, we execute the [Loadable.preloadAll]
method, which, when resolved, starts the server. Furthermore, we have
replaced our standard port 8000 with an environment variable called
[PORT]. If the [PORT] is set, we spawn the back end under
this port; otherwise, the standard port 8000 is used. This behavior will
be useful in the upcoming sections. When the server has started, we can
expect that all components are loaded and ready for rendering.

To reuse the server-side rendered code and declare which modules are
being used, we have to edit our [.babelrc] file. Add the following
lines of code to the [plugins] section of the [.babelrc]
file:

```
"@babel/plugin-syntax-dynamic-import",
"react-loadable/babel"
```


To allow for dynamic imports, we use Babel with the
[\@babel/plugin-syntax-dynamic-import] plugin. It transpiles our
dynamic imports throughout our React code. Furthermore, we use the
[react-loadable/babel] plugin to indicate which modules are being
used to render the current page, so that we can use the same bundles for
the client.

The preparation for the server-side rendering is complete. Now, we have
to collect all of the components that are rendered so that we can
acquire the correct bundles for the user upon the initial page load. In
our [app.get] catch-all Express route, where all SSR requests are
processed, we have to add the [Capture] component of React
Loadable to our [App] component. Replace the current [App]
variable with the following code lines:

```
const modules = [];
const App = (<Capture report={moduleName => modules.push(moduleName)}><Graphbook client={client} loggedIn={loggedIn} location={req.url} context={context}/></Capture>);
```


We have wrapped the [Graphbook] component that we imported earlier
with the [Capture] component. Furthermore, we have created a new
variable, called [modules]. All [modules] that are used
throughout the rendering of our application will be stored there. We
pass a small function to the [report] property of the
[Capture] component, which executes the regular [push]
method to insert the module names to the [modules] array.

Consequently, we have to include those modules with the HTML that we
send to the user. The problem is that we have to identify the bundles
that include those modules. Consequently, we imported the
[getBundles] function from the [react-loadable/webpack]
package earlier. The final [renderToStringWithData] function call
should look as follows:

```
renderToStringWithData(App).then((content) => {
  if (context.url) {
    res.redirect(301, context.url);
  } else {
    var bundles;
    if(process.env.NODE_ENV !== 'development') {
      bundles = getBundles(stats, Array.from(new Set(modules)));
    } else {
      bundles = [];
    }
    const initialState = client.extract();
    const head = Helmet.renderStatic();
    res.status(200);
    res.send(`<!doctype html>\n${template(content, head, initialState, 
    bundles)}`);
    res.end();
  }
});
```


The first six lines of the [else] case, where we pass the rendered
[content] variable to our [template] function, implement the
logic to give us the bundle names. We have created a new [bundles]
variable. If we are in a development environment, the [bundles]
variable is initialized as an empty array.

If we are in a production environment, we use the [getBundles]
function. The first parameter is the JSON file that was created by our
webpack configuration, using the [ReactLoadablePlugin]. The second
parameter of the [getBundles] function is the modules that have
been transformed into a one-dimensional array. The result of the
[getBundles] function is an array of [bundles] that we have
to include with our HTML.

To do so, we pass the final [bundles] array to our
[template] function. We have to adjust our [template.js]
file from the server\'s [ssr] folder to accept and render the
[bundles] variable. First, change the [template] function\'s
signature to match the following line of code:

```
export default function htmlTemplate(content, head, state, bundles) {
```


We just added the [bundles] as the fourth parameter. Next, we have
to include all of the bundles in the HTML. As it is a simple array of
objects, we can use the JavaScript [map] function to process all
bundles. Insert the following line of code above the [script] tag,
with the [bundle.js] file as the [src] attribute:

```
${bundles.map(bundle => `<script src="${bundle.publicPath}"></script>`).join('\n')}
```


The preceding line loops over all array elements. We return a
[script] tag with the public path of the JavaScript [bundle]
for each array element so that the browser can download it. The
[join] method is used to add a line break after each
[script] tag.

The setup looks like it should be finished. However, why do we make a
production build of the client-side code, and not the server-side code?

That is a good question. We will change that next. The reason that we
should do so is that by bundling our server-side code, we will get rid
of unnecessary loading times (when the import statements are processed,
for example). Bundling our back end code will improve the performance.
To bundle our back end, we are going to set up a new webpack
configuration file. Create a [webpack.server.build.config.js] file
next to the other webpack files with the following content:

```
const path = require('path');
var nodeExternals = require('webpack-node-externals');
const buildDirectory = 'dist/server';

module.exports = {
  mode: 'production',
  entry: [
    './src/server/index.js'
  ],
  output: {
    path: path.join(__dirname, buildDirectory),
    filename: 'bundle.js',
    publicPath: '/server'
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          plugins: ["@babel/plugin-transform-runtime"]
        }
      },
    }],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
    target: 'node',
    externals: [nodeExternals()],
  plugins: [],
};
```


The preceding configuration file is very simple and not complex. Let\'s
go through all of the settings that we use to configure webpack, as
follows:

-   We load our new [webpack-node-externals] package at the top.

```{=html}
<!-- -->
```
-   The [build] directory, where we save the bundle, is located in
    the [dist] folder, inside of a special [server] folder.
-   The [mode] field is set to [\'production\'].
-   The [entry] point for webpack is the server\'s root
    [index.js] file.
-   The [output] property holds the standard fields to bundle our
    code and save it inside of the folder specified through the
    [buildDirectory] variable.
-   We use the previously installed
    [\@babel/plugin-transform-runtime] plugin in the
    [module] property to reduce the file size for our bundle.
-   Inside of the [node] property, you can set Node.js-specific
    configuration options. The [\_\_dirname] field tells webpack
    that the global [\_\_dirname] is used with its default
    settings, and is not customized by webpack. The same goes for the
    [\_\_filename] property.
-   The [target] field accepts multiple environments in which the
    generated bundle should work. For our case, we set it to
    [\'node\'], as we want to run our back end in Node.js.
-   The [externals] property gives us the possibility to exclude
    specific dependencies from our bundle. By using the
    [webpack-node-externals] package, we prevent all
    [node\_modules] from being included in our bundle.

To make use of our new build configuration file, we have to add two new
commands to the [scripts] field of our [package.json] file.
As we are trying to generate a final production build that we can
publicize, we have to build our client-side code in parallel. Add the
following two lines to the [scripts] field of the
[package.json] file:

```
"build": "npm run client:build && npm run server:build",
"server:build": "webpack --config webpack.server.build.config.js"
```


The [build] command uses the [&&] syntax to chain two [npm
run] commands. It executes the build process for our client-side
code first, and afterwards, it bundles the entire server-side code. The
result is that we have a filled [dist] folder with a
[client] and a [server] folder. Both can import components
dynamically. To start our server with the new production code, we are
going to add one further command to the [scripts] field. The old
[npm run server] command would start the server-side code in the
unbundled version, which is not what we want. Insert the following line
into the [package.json] file:

```
"server:production": "node dist/server/bundle.js"
```


The preceding command simply executes the [bundle.js] file from
the [dist/server] folder, using the plain [node] command to
launch our back end.

Now, you should be able to generate your final build by running [npm run
build]. Before starting the production server as a test, however,
make sure that you have set all of the environment variables for your
database correctly, or your [JWT\_SECRET], for example. Then, you
can execute the [npm run server:production] command to launch the
back end.

Because we have changed the way that our back end and front end load
components, we have to adapt these changes to our development and
testing commands. When trying to rerun them, the main problem is that
the dynamic imports and React Loadable functionality are not supported.

Replace our [npm run server] command with the following line, in
the [package.json] file:

```
"server": "nodemon --exec babel-node --plugins require-context-hook,dynamic-import-node --watch src/server src/server/index.js",
```


The preceding command has one more plugin, which is the
[dynamic-import-node] package. For our test, the only thing that
we have to change is the [babel-hook.js] file to let Babel
transpile everything correctly. Add the following plugins to the
[babel-hook.js] file:

```
"react-loadable/babel", "dynamic-import-node"
```


Our test runs in the production environment, because only then can we
verify that all features that are enabled in the live environment work
correctly. Because we have just introduced React Loadable, which
generates a JSON file when building the client-side code, we have to run
a full build when we are testing our application. Edit the [test]
command of the [package.json] file to reflect this change, as
follows:

```
"test": "npm run build && mocha --exit test/ --require babel-hook --require @babel/polyfill --recursive",
```


Now, you should be able to test your application again.

This entire setup allows us to render your complete application, but
instead of one big bundle, we only load the chunks that are required to
render the current page that\'s shown to the user. When a user navigates
to a new page, only the chunks that are required are fetched from the
server.

For the development environment, we stick with a simple setup, and we
only include the [bundle.js] file. If necessary, the code that\'s
included with the bundle will load all of the other files.

In the next section, we will cover how to use Docker to bundle your
entire application.


Setting up Docker
=================

Publishing an application is a critical step that requires a lot of work
and care. Many things can go wrong when releasing a new version.

We have already made sure that we can test our application before it
goes live. After deployment, we will have Apollo Engine, which will
inform us about anything that goes well and anything that goes wrong.

The real act of transforming our local files into a production-ready
package, which is then uploaded to a server, is the most onerous task.
Regular applications generally rely on a server that is preconfigured
with all the packages that the application needs to run. For example,
when looking at a standard PHP setup, most people rent a preconfigured
server. This means that the PHP runtime, with all of the extensions,
like the MySQL PHP library, are installed via the built-in package
manager of the operating system. This procedure applies not only to PHP,
but also to nearly any other programming language. This might be okay
for general websites or applications that are not too complex, but for
professional software development or deployment, this process can lead
to issues, such as the following:

-   The configuration needs to be done by someone that knows the
    requirements of the application, and the server itself.
-   A second server needs the same configuration, in order to allow our
    application to run. While doing that configuration, we must ensure
    that all servers are standardized and consistent with one another.
-   All of the servers have to be reconfigured when the runtime
    environment gets an update, either because the application requires
    it, or due to other reasons, such as security updates. In this case,
    everything must be tested again.
-   Multiple applications running inside of the same server environment
    may require different package versions, or may interfere with each
    other.
-   The deployment process must be executed by someone with the required
    knowledge.
-   Starting an application directly on a server exposes it to all
    services running on your server. Other processes could take over
    your complete application, since they run within the same
    environment.
-   Also, the application is not limited to using a specified maximum of
    the server\'s resources.

Many people have tried to figure out how to avoid these consequences by
introducing a new containerization and deployment workflow.



What is Docker?
---------------

One major trending price of software is called Docker. It was released
in 2013, and its aim is at isolating the application within a container
by offering its own runtime environment, without having access to the
server itself.

The aim of a container is to isolate the application from the operating
system of the server.

Standard virtual machines can also accomplish this by running a guest
operating system for the application. Inside of the virtual machine, all
packages and runtimes can be installed to prepare it for your
application. This solution comes with significant overhead, of course,
because we are running a second operating system that\'s just for our
application. It is not scalable when many services or multiple
applications are involved.

On the other hand, Docker containers work entirely differently. The
application itself, and all of its dependencies, receive a segment of
the operating system\'s resources. All processes are isolated by the
host system inside of those resources.

Any server supporting the container runtime environment (which is
Docker) can run your dockerized application. The great thing is that the
actual operating system is abstracted away. Your operating system will
be very slim, as nothing more than the kernel and Docker is required.

With Docker, the developer can specify how the container image is
composed. They can directly test and deploy those images on their
infrastructure.

To see the process and advantages that Docker provides, we are going to
build a container image that includes our application and all of the
dependencies it needs to run.



Installing Docker
-----------------

Like any virtualization software, Docker has to be installed via the
regular package manager of your operating system.

I will assume that you are using a Debian-based system. If this is not
the case, please get the correct instructions for your system at
<https://docs.docker.com/install/overview/>.

Continue with the following instructions to get Docker up and running:

1.  Update your system\'s package manager, as follows:

```
sudo apt-get update
```


2.  Install all of the dependencies for Docker, as follows:

```
sudo apt-get install apt-transport-https ca-certificates curl gnupg2 software-properties-common
```


3.  Verify and add the **GNU Privacy Guard** (**GPG**) key for the
    Docker repository, as follows:

```
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -
```


If you are using Ubuntu, add the separate GPG key from the official
Docker documentation, or just replace the word [debian] with
[ubuntu] in the preceding URL.

4.  Now that the GPG key has been imported, we can add the repository to
    the package manager, as follows:

```
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"
```


Again, if you use Ubuntu, please add the repository made for Ubuntu by
replacing the word [debian] with [ubuntu].

5.  After adding the new repository, you must update the package
    manager\'s index again, as follows:

```
sudo apt-get update
```


6.  Lastly, we can install the Docker package to our system, as follows:

```
sudo apt-get install docker-ce
```


The [docker-ce] package stands for **Docker Community Edition**.
There are two further versions, which include more features, but which
are also meant for bigger teams. You can look at what makes them
different from the Community Edition in the installation overview of the
Docker documentation.

That\'s everything that is required to get a working copy of Docker on
your system.

Next, you will learn how to use Docker by building your first Docker
container image.



Dockerizing your application
----------------------------

Many companies have adopted Docker and replaced their old infrastructure
setup, thereby largely reducing system administration. Still, there is
some work to do before deploying your application straight to
production.

One primary task is to dockerize your application. The term
**dockerize** means that you take care of wrapping your application
inside of a valid Docker container.

There are many service providers that connect Docker with continuous
integration or continuous deployment, because they work well together.
In the last section of this lab, you will learn what continuous
deployment is, and how it can be implemented. We are going to rely on
such a service provider. It will provide us with an automatic workflow
for our continuous deployment process. As this course should teach you how
to dockerize your application without relying on too many third parties,
we are going to implement it in the official Docker way.



Writing your first Dockerfile
-----------------------------

The conventional approach to generating a Docker image of your
application is to create a [Dockerfile] in the root of your
project. But what does the [Dockerfile] stand for?

A [Dockerfile] is a series of commands that are run through the
Docker CLI. The typical workflow in such a file looks as follows:

1.  A [Dockerfile] starts from a base image, which is imported
    using the [FROM] command. This base image may include a
    runtime environment, like Node.js, or other things that your project
    can make use of. The container images are downloaded from the Docker
    Hub, which is a central container registry that you can find at
    <https://hub.docker.com/>. There is the option to download the
    images from custom registries, too.
2.  Then, Docker offers many commands to interact with the image and
    your application code. Those commands can be looked up at
    <https://docs.docker.com/engine/reference/builder/>.
3.  After the configuration of the image has finished and all of the
    build steps are complete, you will need to provide a command that
    will be executed when your application\'s Docker container starts.

```{=html}
<!-- -->
```
4.  The result of all of the build steps will be a new docker image. The
    image is saved on the machine where it was generated.
5.  Optionally, you can now publish your new image to a registry, where
    other applications or users can pull your image. You can also upload
    them as private images or private registries.

We will start by generating a really simple Docker image. First, create
the [Dockerfile] inside of the root of your project. The filename
is written without any file extensions.

The first task is to find a matching base image that we can use for our
project. The criteria by which we choose a base image are the
dependencies and runtime environment. As we have mainly used Node.js
without relying on any other server-side package that needs to be
covered from our Docker container, we only need to find a base image
that provides Node.js. For the moment, we will ignore the database, and
we\'ll focus on it again in a later step.

Docker Hub is the official container image registry, providing many
minimalistic images. Just insert the following line inside of our new
[Dockerfile], in the root of our project:

```
FROM node:10
```


As we mentioned before, we use the [FROM] command to download our
base image. As the name of the preceding image states, it includes
Node.js in version 10. There are numerous other versions that you can
use. Beyond the different versions, you can also find different flavors
(for example, a Node.js based on an Alpine Linux image). Take a look at
the image\'s [readme] to get an overview of the available options,
at <https://hub.docker.com/_/node/>.[](https://hub.docker.com/_/node/)

**ProTip**

I recommend that you read through the reference documentation of the
[Dockerfile]. Many advanced commands and scenarios are explained
there, which will help you to customize your Docker workflow. Just go to
<https://docs.docker.com/engine/reference/builder/>.


After Docker has run the [FROM] command, you will be working
directly within this base image, and all further commands will then run
inside of this environment. You can access all of the features that the
underlying operating system provides. Of course, the features are
limited by the image that you have chosen. A [Dockerfile] is only
valid if it starts with the [FROM] command.

The next step for our [Dockerfile] is to create a new folder, in
which the application will be stored and run. Add the following line to
the [Dockerfile]:

```
WORKDIR /usr/src/app
```


The [WORKDIR] command changes the directory to the specified path.
The path that you enter lives inside of the filesystem of the image,
which does not affect your computer\'s filesystem. From then on, the
Docker commands [RUN], [CMD], [ENTRYPOINT],
[COPY], and [ADD] will be executed in the new working
directory. Furthermore, the [WORKDIR] command will create the new
folder, if it does not exist yet.

Next, we need to get our application\'s code inside of the new folder.
Until now, we have only made sure that the base image was loaded. The
image that we are generating at the moment does not include our
application yet. Docker provides a command to move our code into the
final image.

As the third line of our [Dockerfile], add the following code:

```
COPY . .
```


The [COPY] command accepts two parameters. The first one is the
source, which can be a file or folder. The second parameter is the
destination path inside of the image\'s filesystem. You can use a subset
of regular expressions to filter the files or folders that you copy.

After Docker has executed the preceding command, all contents living in
the current directory will be copied over to the [/usr/src/app]
path. The current directory, in this case, is the root of our project
folder. All of the files are now automatically inside of the final
Docker image. You can interact with the files through all Docker
commands, but also with the commands the shell provides.

One important task is that we install all of the npm packages that our
application relies on. When running the [COPY] command, like in
the preceding code, all of the files and folders are transferred,
including the [node\_modules] folder. This could lead to problems
when trying to run the application, however. Many [npm] packages
are compiled when they are being installed, or they differentiate
between operating systems. We must make sure that the packages that we
use are clean, and work in the environment that we want them to work in.
We must do two things to accomplish this, as follows:

1.  Create a [.dockerignore] file in the root of the project
    folder, next to the [Dockerfile], and enter the following
    content:

```
node_modules
package-lock.json
```


The [.dockerignore] file is comparable to the [.gitignore]
file, which excludes special files or folders from being tracked by Git.
Docker reads the [.dockerignore] file before all files are sent to
the Docker daemon. If it is able to read a valid [.dockerignore],
all specified files or folders are excluded. The preceding two lines
exclude the whole [node\_modules] folder and the
[package-lock.json] file. The last one is critical, because the
exact versions of all npm packages are saved in this file.

2.  Install the npm packages inside of the Docker image that we are
    creating at the moment. Add the following line of code to the
    [Dockerfile]:

```
RUN npm install
```


The [RUN] command executes [npm install] inside of the
current working directory. The related [package.json] file and
[node\_modules] folder are stored in the file system of the Docker
image. Those files are directly committed, and are included in the final
image. Docker\'s [RUN] command sends the command that we pass as
the first parameter into the Bash and executes it. To avoid the problems
of spaces in the shell commands, or other syntax problems, you can pass
the command as an array of strings, which will be transformed by Docker
into valid Bash syntax. Through [RUN], you can interact with other
system-level tools (like [apt-get] or [curl], for example).

Now that all of the files and dependencies are in the correct
filesystem, we can start Graphbook from our new Docker image. Before
doing so, there are two things that we need to do: we have to allow for
external access to the container via the IP, and define what the
container should do when it has started.

Graphbook uses port [8000] by default, under which it listens for
incoming requests, be it a GraphQL or a normal web request. When running
a Docker container, it receives its own network, with IP and ports. We
must make port 8000 available to the public, not only inside of the
container itself. Insert the following line at the end of the
[Dockerfile] to make the port accessible from outside of the
container:

```
EXPOSE 8000
```


It is essential that you understand that the [EXPOSE] command does
not map the inner port [8000] from the container to the matching
port of our working machine. By writing the [EXPOSE] command, you
give the developer using the image the option to publish port
[8000] to any port of the real machine running the container. The
mapping is done while starting the container, not when building the
image. Later in this lab, we will look at how to map port
[8000] to a port of your local machine.

Finally, we have to tell Docker what our container should do once it has
booted. In our case, we want to start our back end (including SSR, of
course). Since this should be a simple example, we will start the
development server.

Add the last line of the [Dockerfile], as follows:

```
CMD [ "npm", "run", "server" ]
```


The [CMD] command defines the way that our container is booted,
and which command to run. We are using the [exec] option of Docker
to pass an array of strings. A [Dockerfile] can only have one
[CMD] command. The [exec] format does not run a Bash or
shell command when using [CMD].

The container executes the [server] script of our
[package.json] file, which has been copied into the Docker image.

At this point, everything is finished and prepared to generate a basic
Docker image. Next, we will continue with getting a container up and
running.



Building and running Docker containers
--------------------------------------

The [Dockerfile] and [.dockerignore] files are ready. Docker
provides us with the tools to generate a real image, which we can run or
share with others. Having a [Dockerfile] on its own does not make
an application dockerized.

Make sure that the database credentials specified in the
[/server/config/index.js] file for the back end are valid for
development, because they are statically saved there. Furthermore, the
MySQL host must allow for remote connections from inside the container.

Execute the following command to build the Docker image on your local
machine:

```
docker build -t sgrebe/graphbook .
```


This command requires you to have the Docker CLI and daemon installed.

The first option that we use is [-t], following a string (in our
case, [sgrebe/graphbook]). The finished build will be saved under
the username [sgrebe] and the application name [graphbook].
This text is also called a [tag]. The only required parameter of
the [docker build] command is the build context, or the set of
files that Docker will use for the container. We specified the current
directory as the build context by adding the dot at the end of the
command. Furthermore, the [build] action expects the
[Dockerfile] to be located within this folder. If you want the
file to be taken from somewhere else, you can specify it with the
[\--file] option.

**ProTip**

If the [docker build] command fails, it may be that some
environment variables are missing. They usually include the IP and port
of the Docker daemon. To look them up, execute the [docker-machine
env] command, and set the environment variables as returned by the
command.


When the command has finished generating the image, it should be
available locally. To prove this, you can use the Docker CLI by running
the following command:

```
docker images
```


The output from Docker should look as follows:


![](./images/5e102ae9-2c4c-4e30-92d1-1c3200d7ed4c.png)


You should see two containers; the first one is the
[sgrebe/graphbook] container image, or whatever you used as a tag
name. The second one should be the [node] image, which we used as
the base for our custom Docker image. The size of the custom image
should be much higher, because we installed all npm packages.

Now, we should be able to start our Docker container with this new
image. The following command will launch your Docker container:

```
docker run -p 8000:8000 -d --env-file .env sgrebe/graphbook
```


The [docker run] command also has only one required parameter,
which is the image to start the container with. In our case, this is
[sgrebe/graphbook], or whatever you specified as a tag name.
Still, we define some optional parameters that we need to get our
application working. You can find an explanation of each of them, as
follows:

-   We set the [-p] option to [8000:8000]. The parameter is
    used to map ports from the actual host operating system to a
    specific port inside of the Docker container. The first port is the
    port of the host machine, and the second one is the port of the
    container. This option gives us access to the exposed port 8000,
    where the application is running under the
    [http://localhost:8000] of our local machine.
-   The [\--env-file] parameter is required to pass environment
    variables to the container. Those can be used to hand over the
    [NODE\_ENV] or [JWT\_SECRET] variables, for example,
    which we require throughout our application. We will create this
    file in a second.

```{=html}
<!-- -->
```
-   You can also pass the environment variables one by one using the
    [-e] option. It is much easier to provide a file, however.
-   The [-d] option sets the container to **detached mode**. This
    means that your container will not run in the foreground after
    executing it inside the shell. Instead, after running the command,
    you will have access to the shell again, and will see no output from
    the container. If you remove the option again, you will see all of
    the logs that our application triggers.

**ProTip**

The [docker run] command provides many more options. It allows for
various advanced setups. The link to the official documentation is
<https://docs.docker.com/engine/reference/run/#general-form>.


Let\'s create the [.env] file in the root directory of our
project. Insert the following content, replacing all placeholders with
the correct value for every environment variable:

```
ENGINE_KEY=YOUR_APLLO_ENGINE_API_KEY
NODE_ENV=development
JWT_SECRET=YOUR_JWT_SECRET
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
```


The [.env] file is a simple key-value list, where you can specify
one variable per line, which our application can access from its
environment variables.

It is vital that you do not commit this file to the public at any stage.
Please add this file directly to the [.gitignore] file.

If you have filled out this file, you will be able to start the Docker
container with the previous command that I showed you. Now that the
container is running in the detached mode, you will have the problem
that you cannot be sure whether Graphbook has started to listen.
Consequently, Docker also provides a command to test this, as follows:

```
docker ps
```


The [docker ps] command gives you a list of all running
containers. You should find the Graphbook container in there, too. The
output should appear as follows:


![](./images/a2d98581-3f27-4fc3-9482-205cef99596d.png)


**ProTip**

Like all commands that Docker provides, the [docker ps] command
gives us many options to customize and filter the output. Read up on all
of the features that it offers in the official documentation at
<https://docs.docker.com/engine/reference/commandline/ps/>.


Our container is running, and it uses the database that we have
specified. You should be able to use Graphbook as you know it by
visiting [http://localhost:8000].

If you take a look at the preceding image, you will see that all running
containers receive their own ids. This id can be used in various
situations to interact with the container.

In development, it makes sense to have access to the command-line
printouts that our application generates. When running the container in
the detached mode, you have to use the Docker CLI to see the printouts,
using the following command. Replace the id at the end of the command
with the id of your container:

```
docker logs 08499322a998
```


The [docker logs] command will show you all of the printouts that
have been made by our application or container recently. Replace the
preceding id with the one given to you by the [docker ps] command.
If you want to see the logs in real time, while using Graphbook, you can
add the [\--follow] option.

As we are running the container in the detached mode, you will not be
able to stop it by just using *Ctrl* + *C,* like before. Instead, you
have to use the Docker CLI again.

To stop the container again, run the following command:

```
docker rm 08499322a998
```


The [docker rm] command stops and removes the container from the
system. Any changes made to the filesystem inside of the container will
be lost. If you start the image again, a new container will be created,
with a clean filesystem. Alternatively, you can also use the
[stop] command instead, which only shuts down the container.

When working and developing with Docker frequently, you will probably
generate many images to test and verify the deployment of your
application. These take up a lot of space on your local machine. To
remove the images, you can execute the following command:

```
docker rmi fe30bceb0268
```


The id can be taken from the [docker images] command, the output
of which you can see in the first image in this section. You can only
remove an image if it is not used in a running container.

We have come far. We have successfully dockerized our application.
However, it is still running in development mode, so there is a lot to
do.



Multi-stage Docker production builds
------------------------------------

Our current Docker image, which we are creating from the
[Dockerfile], is already useful. We want our application to be
transpiled and running in production mode, because many things are not
optimized for the public when running in development mode.

Obviously, we have to run our build scripts for the back end and front
end while generating the Docker image.

Up until now, we have installed all npm packages and copied all files
and folders for our project to the container image. This is fine for
development, because this image is not published or deployed to a
production environment. When going live with your application, you will
want your image to be as slim and efficient as possible. To achieve
this, we will use a so-called **multi-stage build**.

Before Docker implemented the functionality to allow for multi-stage
builds, you had to rely on tricks, like using shell commands to only
keep the files that were really required in the container image. The
problem that we have is that we copy all of the files that are used to
build the actual distribution code from the project folder. Those files
are not needed in the production Docker container, however.

Let\'s see how this looks in reality. You can back up or remove the
first [Dockerfile] that we wrote, as we will start with a blank
one now. The new file still needs to be called [Dockerfile]. All
of the following lines of code go directly into this empty
[Dockerfile]. Follow these instructions to get the multi-stage
production build running:

1.  Our new file starts with the [FROM] command again. We are
    going to have multiple [FROM] statements, because we are
    preparing a multi-stage build. The first one should look as follows:

```
FROM node:10 AS build
```


We are introducing the first build stage here. Like before, we are using
the [node] image in version 10. Furthermore, we append the [AS
build] suffix, which tells Docker that this stage, or everything
that we do in it, will be accessible under the name [build] later
on. A new stage is started with every new [FROM] command.

2.  Next, we initialize the working directory, like we did in our first
    [Dockerfile], as follows:

```
WORKDIR /usr/src/app
```


3.  It is essential to only copy the files that we really need. It
    hugely improves the performance if you reduce the amount of
    data/files that need to be processed:

```
COPY .babelrc ./
COPY package*.json ./
COPY webpack.server.build.config.js ./
COPY webpack.client.build.config.js ./
COPY src src
COPY assets assets
```


We copy the [.babelrc], [package.json],
[package-lock.json], and webpack files that are required for our
application. These include all of the information we need to generate a
production build for the front end and back end. Furthermore, we also
copy the [src] and [assets] folders, because they include
the code and CSS that will be transpiled and bundled.

4.  Like in our first [Dockerfile], we must install all npm
    packages; otherwise, our application won\'t work. We do this with
    the following line of code:

```
RUN npm install
```


5.  After we have copied all of the files and installed all of the
    packages, we can start the production build. Before doing so, it
    would make sense to run our automated test. Add the test script to
    the [Dockerfile], as follows:

```
ENV NODE_ENV production
ENV JWT_SECRET YOUR_SECRET
ENV username YOUR_USERNAME
ENV password YOUR_PASSWORD
ENV database YOUR_DATABASE
ENV host YOUR_HOST
RUN npm install -g mysql2 sequelize sequelize-cli
RUN sequelize db:migrate --migrations-path src/server/migrations --config src/server/config/index.js --env production
RUN npm run test
```


We use the [ENV] command from Docker to fill the environment
variables while building the image. This is needed to run our test,
because this way, we can add the required variables, such as
[NODE\_ENV] and [JWT\_SECRET].

Before running a test, we have to migrate all database changes to the
test database. We do this by installing Sequelize and using the
[db:migrate] feature. You will see this command again later.

We are running our Mocha test, as we did before. The good thing here is
that every time our application gets dockerized, the test will run
automatically. If the test fails, the error will bubble up, and the
complete build will fail. We will never launch the application if a test
fails.

6.  After all packages have been installed successfully, we can start
    the build process. We added the [build] script in the first
    section of this lab. Add the following line to execute the
    script that will generate the production bundles in the Docker
    image:

```
RUN npm run build
```


The following command will generate a [dist] folder for us, where
the runnable code (including CSS) will be stored. After the [dist]
folder with all of the bundles has been created, we will no longer need
most of the files that we initially copied over to the current build
stage.

7.  To get a clean Docker image that only contains the [dist]
    folder and the files that we need to run the application, we will
    introduce a new build stage that will generate the final image. The
    new stage is started with a second [FROM] statement, as
    follows:

```
FROM node:10
```


We are building the final image in this build step; therefore, it does
not need its own name.

8.  Again, we need to specify the working directory for the second
    stage, as the path is not copied from the first build stage:

<div>

```
WORKDIR /usr/src/app
```


</div>

9.  Because we have given our first build stage a name, we can access
    the filesystem of this stage through that name. To copy the files
    from the first stage, we can add a parameter to the [COPY]
    statement. Add the following commands to the [Dockerfile]:

```
COPY --from=build /usr/src/app/package.json package.json
COPY --from=build /usr/src/app/dist dist
```


As you should see in the preceding code, we are copying the
[package.json] file and the [dist] folder. However, instead
of copying the files from our original project folder, we are getting
those files directly from the first build stage. For this, we use the
[\--from] option, following the name of the stage that we want to
access; so, we enter the name [build]. The [package.json]
file is needed because it includes all of the dependencies, and also the
[scripts] field, which holds the information on how to run the
application in production. The [dist] folder is, of course, our
bundled application.

10. Notice that we only copy the [package.json] file and the
    [dist] folder. Our npm dependencies are not included in the
    application build inside of the [dist] folder. As a result, we
    need to install the [npm] packages in the second build stage,
    too:

```
RUN npm install --only=production
```


The production image should only hold npm packages that are really
required; npm offers the [only] parameter, which lets you install
only the production packages, as an example. It will exclude all of the
[devDependecies] of your [package.json] file. This is really
great for keeping your image size low.

11. The last two things to do here are to expose the container port to
    the public and to execute the [CMD] command, which will let
    the image run a command of our [package.json] file when the
    container has booted:

```
EXPOSE 8000
CMD [ "npm", "run", "server:production" ]
```


You should have seen both of these commands in our first
[Dockerfile]. The only difference is that we execute the
[server:production] command from our [package.json] file.
This will start our bundled application from the [dist] folder of
the final image.

Now, you can execute the [docker build] command again, and try to
start the container. There is only one problem: the database credentials
are read from the environment variables when running in production. As
the production setup for a database cannot be on our local machine, it
needs to live somewhere on a real server. We could also accomplish this
through Docker, but this would involve a very advanced Docker
configuration. We would need to save the MySQL data in separate storage,
because Docker does not persist data of any kind, by default.

I personally like to rely on a cloud host, which handles all of the
database setup for me. It is not only great for the overall setup, but
it also improves the scalability of our application. The next section
will cover the Amazon Relational Database Service, and how to configure
it for use with our application. You can, of course, use any database
infrastructure that you like.


Amazon Relational Database Service
==================================

AWS offers the Amazon **Relation Database Service (RDS)**, which is an
easy tool for setting up a relational database in just a few clicks.
Shortly, I will explain how to create your first database with RDS, and
afterwards, we will look at how to insert environment variables
correctly, in order to get a database connection going with our
application.

The first step is to log in to the AWS Console, like we did in Lab 7, *Handling Image Uploads*. You can find the service by clicking on the
[Services] tab in the top bar and searching for
[RDS].

After navigating to [RDS], you will see the dashboard for
the Relational Database Service, as shown in the following screenshot:


![](./images/21f83f89-7cdc-460f-bbdc-889e960194a8.png)


The first step is to initialize a new database by hitting the [Create
database] button. You will be presented with a new
screen, where you should select an engine for our new database. I
recommend that you select [MySQL] here. You should also
be able to select [Amazon Aurora] or
[MariaDB], as they are also MySQL compatible; for this
book, I have chosen MySQL. Continue by clicking [Next].

Then, you will need to specify the use case for your database. Both of
the production options are very good for live applications, but generate
real costs. Please be aware that this should only be used when going
public with your application, and when you are able to pay the fees for
the service.

If you want to try Amazon RDS, you can choose the third option, which
should be the [Dev MySQL] database. In this case, it is
not a production-ready database, but you will notice the advantages of a
database inside of the cloud, anyway. For your first test, I recommend
that you go on with this selection. Continue by clicking
[Next].

You will be asked for the database specification details. The first part
of the screen will look as follows:


![](./images/634dba81-c58c-4e1e-8b17-588b456da57b.png)


Make sure that you choose the same settings that are shown in the
preceding screenshot. If you only want to use the free tier of Amazon,
select the checkbox in the blue alert box. This option will set the [DB
instance class] to [micro], and the
allocated storage amount to [20 GiB], fixed.

Below the instance specifications, you have to enter the credential
settings for your database. The credentials consist of a database
identifier, a username, and a password. The database identifier must be
unique to your AWS account. You will need to insert those credentials
into the environment variables later on. You can continue by hitting
[Next] again.

You will now be asked for advanced settings. The only thing that you
need to specify is the database name, in the [Database
options] box. It is important that you select [Public
accessibility,] with [Yes] checked. This
does not share your database to the public, but makes it accessible from
other IPs and other EC2 instances, if you select them in your AWS
Security Group. Finish the setup process for your first AWS RDS database
by clicking on [Create database] at the bottom of the
screen.

You should now be redirected to the dashboard of the new database
instance.

Inside of the [Connect] box, you can find the security
groups that have been applied to the instance. Click on the group with
the type [CIDR/IP - Inbound].

You will see a list of security groups and a small view with some tabs
at the top, as follows:


![](./images/0043990b-e8a3-42cc-9ef8-07f7a3c3a8cd.png)


In the preceding screenshot, you can see how the security groups for
your new database should look. At the bottom of the window, inside of
the small view, select the [Inbound] tab. There, you will
be able to insert the IP that is allowed to access the database. If you
insert the [0.0.0.0] IP, it will allow any remote IP to access the
database. This is not a recommended database setup for production use,
but it makes it easier to test it with multiple environments in
developmental use.

The credentials that you have specified for the database must be
included in the [.env] file for running our Docker container, as
follows:

```
username=YOUR_USERNAME
password=YOUR_PASSWORD
database=YOUR_DATABASE
host=YOUR_HOST
```


The [host] URL can be taken from the Amazon RDS instance
dashboard. It should look something like
[INSTANCE\_NAME.xxxxxxxxxx.eu-central-1.rds.amazonaws.com].

Now, you should be able to run the build for your Docker image again,
without any problems. The database has been set up and is available.

If the test runs through, it will create a new user, as we have
specified this in the Mocha test file. The user will be inserted into
the database that has been set in the [Dockerfile], via the
[ENV] command. You have to ensure that this database is cleaned
after each test is run; otherwise, the second test will fail, because we
are trying to create a new user that already exists after running the
test for the first time. By using the [ENV] commands, we can set a
special test database that will be used while generating the Docker
image.

Next, we will look at how we can automate the process of generating the
Docker image through continuous integration.


Configuring Continuous Integration
==================================

Many people (especially developers) will have heard of **continuous
integration** (**CI**) or **continuous deployment** (**CD**). However,
most of them cannot explain their meanings and the differences between
the two terms. So, what is continuous integration and deployment, in
reality?

When it comes to going live with your application, it might seem easy to
upload some files to a server and then start the application through a
simple command in the shell, via SSH.

This approach might be a solution for many developers, or for small
applications that are not updated often. For most scenarios, it is not a
good approach, however. The word **continuous** represents the fact that
all changes or updates are continuously reflected by our application to
the user. This would be a lot of work, and it would be tough to do if we
stayed with a simple file upload and took a manual approach. Automating
this workflow makes it convenient to update your application at any
time.

Continuous integration is the development practice where all developers
commit their code to the central project repository at least once a day
to bring their changes to the mainline stream of code. The integrated
code will be verified by automated test cases. This will avoid problems
when trying to go live at a specific time.

Continuous deployment goes further; it\'s based on the main principles
of continuous integration. Every time the application is successfully
built and tested, the changes are directly released to the customer.
This is what we are going to implement.

Our automation process will be based on CircleCI. It is a third-party
service offering a continuous integration and delivery platform, with a
massive amount of features.

To sign up for CircleCI, visit <https://circleci.com/signup/>.

You will need to have a Bitbucket or GitHub account in order to sign up.
This will also be the source from which the repositories of your
application will be taken, for which we can begin using CI or CD.

To get your project running with CircleCI, you will need to click on the
[Add Projects] button in the left-hand panel, or you will
be redirected there because you have no projects setup yet. After
signing up, you should see all of your repositories inside of CircleCI.

Select the project that you want to process with CircleCI by hitting
[Set up Project] on the right-hand side of the project.
You will then be confronted with the following screenshot:


![](./images/e9f3deb5-8df5-4523-af18-67045283598a.png)


Select the [Operating System] as [Linux]
and the [Language] as [Node]. The final
step will be to hit the [Start building] button at the
bottom of the window.

The problem is that you have not configured your repository or
application accordingly. You are required to create a folder called
[.circleci], and a file inside of it, called [config.yml],
which tells CircleCI what to do when a new commit is pushed to the
repository.

We will create a straightforward first CircleCI configuration so that we
can test that everything is working. The final configuration will be
done at a later step, when we have configured Heroku.

So, create a [.circleci] folder in the root of our project and a
[config.yml] file inside of this new folder. The [.yml] file
extension stands for YAML, which is a file format for saving various
configurations or data. What is important here is that all [.yml]
files need a correct indentation. Otherwise, they will not be valid
files, and cannot be understood by CircleCI.

Insert the following code into the [config.yml] file:

```
version: 2
jobs:
  build:
    docker:
      - image: circleci/node:10
    steps:
      - checkout
      - setup_remote_docker:
          docker_layer_caching: true
      - run:
          command: echo "This is working"
```


Let\'s quickly go through all of the steps in the file, as follows:

1.  The file starts with a [version] specification. We are using
    version 2, as this is the current version of CircleCI.
2.  Then, we will have a list of [jobs] that get executed in
    parallel. As we only have one thing that we want to do, we can only
    see the [build] job that we are running. Later, we will add
    the whole docker build and publish the functionality here.
3.  Each job receives an executor type, which needs to be
    [machine], [docker], or [macos]. We are using the
    [docker] type, because we can rely on many prebuilt images of
    CircleCI. The image is specified in a separate [image]
    property. There, I have specified [node] in version 10,
    because we need Node.js for our CI workflow.
4.  Each job then receives a number of steps that are executed with
    every commit that is pushed to the Git repository.
5.  The first step is the [checkout] command, which clones the
    current version of our repository, so that we can use it in any
    further steps.
6.  The second [setup\_remote\_docker] command will create a
    remote environment, in which we can run docker commands, like
    [docker build]. We will use this later, when we are building
    our application automatically. The [docker\_layer\_caching]
    property enables the caching of each Docker command that we run.
    This will make our build time much faster, because we are saving
    each layer or command that we run through Docker. Only the Docker
    commands are executed, which follow a change in the
    [Dockerfile].

```{=html}
<!-- -->
```
7.  Lastly, to test that everything has worked, we use the [run]
    step. It lets us execute a command directly in the Docker
    [node:10] image that we have started with CircleCI. Each
    command that you want to execute must be prefixed with
    [command].

The result of this config file should be that we have pulled the current
master branch of our application and printed the text [This is
working] at the end. To test the CircleCI setup, commit and push
this file to your GitHub or Bitbucket repository.

CircleCI should automatically notify you that it has started a new
**continuous integration** job for our repository. You can find the job
by hitting the [Jobs] button in the left-hand panel of
CircleCI. The newest job should be at the top of the list. Click on the
job to see the details. They should look as follows:


![](./images/b1da88ef-7986-4bbe-a016-3685234750a0.png)


In the preceding screenshot, each step is represented in a separate row,
at the bottom of the window. You can expand each row to see the logs
that printed while executing the specific command shown in the current
row. The preceding screenshot shows that the job has been successful.

Now that we have configured CircleCI to process our repository on each
push, we must take a look at how to host and deploy our application
directly, after finishing the build.


Deploying applications to Heroku
================================

CircleCI executes our build steps each time we push a new commit. Now,
we want to build our Docker image and deploy it automatically to a
machine that will serve our application to the public.

Our database and files are hosted on Amazon Web Services already, so we
could also use AWS to serve our application. The problem is that setting
up AWS correctly is a significant task, and it takes a large amount of
time. We could use AWS ECS or EC2 to run our Docker image. Still, to
correctly set up the network, security, and container registry is too
complex to be explained in just one lab. I recommend that you take a
course or pick up a separate book, to understand and learn advanced
setups with AWS, and the configuration that is needed to get a
production-ready hosting.

We will use Heroku to host and deploy our application, as it is much
more user-friendly and easier to set up. To get started, you must sign
up for a free Heroku account. You can do this at
<https://signup.heroku.com/>.

After logging in, you will be redirected to the apps list for Heroku, as
shown in the following screenshot:


![](./images/19afe560-274e-40d9-ab96-eea583d32298.png)


As you can see, I have already created an app called
**[graphbook]**. You should do so, too, by hitting the
[New] button in the top-right corner, and then clicking
on [Create new app].

You will be asked for the name of your application. The name of the
application must be unique across Heroku, as it will be used as the
subdomain under which your application will be accessible. That is all
we have to do to set up our Heroku app correctly.

You will be redirected to the app dashboard, as follows:


![](./images/33b5cc2d-a0e5-4d05-b54d-a0a799f48873.png)


You can find the different Heroku features at the top of the window, in
different tabs, as follows:

-   The current one, which we can see in the preceding screenshot, is
    the [Overview], which shows us the latest activity
    and the current Dynos that we are using on the left-hand side. You
    can see that I am already running the Docker image successfully,
    with the [npm run server:production] command. Dyno is a kind
    of flexible computing time, which represents the basis on which
    Heroku\'s system and pricing work.
-   The [Resources] tab shows you information about the
    Dynos that we are using, as well as [add-ons] that
    Heroku provides. They provide a dozen [add-ons],
    which includes a MySQL database, a CMS system, and many others.
-   The [Deploy] tab shows you information about the
    deployment process. Here, you can find information on how deploying
    through Git, GitHub, or the Docker Registry works. Furthermore, you
    can also set up a CI/CD pipeline, like we did manually through
    CircleCI.
-   The [Metrics] tab provides analytics on CPU usage and
    other things. This could be helpful for seeing the workload in
    production.

```{=html}
<!-- -->
```
-   The [Activity] tab shows you the latest things that
    have happened with the Heroku app.
-   The [Access] tab gives you the option to share your
    Heroku app with other colleagues so that they can work together with
    you as a team.
-   The [Settings] tab shows you basic information and
    configuration options that can be used to customize your
    application. You can find the current Heroku URL, under which your
    application is served. You can also add custom domains, under which
    it will be served. More advanced options, like adding environment
    variables, can also be found here.

Now that our Heroku app has been set up, we can prepare our CD workflow.
Before going over to our CircleCI configuration file, we should verify
that the new Heroku app can run our application as planned. We are going
to test this manually, via the Terminal. Later, CircleCI will automate
this process for us.

We should add all of the environment variables that we are using
throughout our application first. Our application has to know the
credentials for the database, the AWS API keys, and much more. Go to the
[Settings] tab and hit [Reveal Config
Vars], under [Config Vars]. You can add
each variable by clicking the [Add] button, as shown in
the following screenshot:


![](./images/c74cb088-9666-489b-898e-f060d58bd2f4.png)


All of the environment variables can be taken from the preceding
screenshot. Otherwise, our application will not run as expected.

Continue by installing the Heroku CLI on your local machine to test the
workflow manually. The instructions can be found at
<https://devcenter.heroku.com/articles/heroku-cli>.[](https://devcenter.heroku.com/articles/heroku-cli)

If you have Snap installed on your system, you can run the following
command:

```
sudo snap install --classic heroku
```


If this is not the case, manually install the Heroku CLI by using the
following command:

```
curl https://cli-assets.heroku.com/install.sh | sh
```


Make sure that the installation has worked by verifying the version
number, using the [heroku] command, as follows:

```
heroku --version
```


From now on, you can follow these instructions to test that your
workflow works as expected:

1.  The Heroku CLI offers a [login] method. Otherwise, you cannot
    access your Heroku app and deploy images to it. Execute the
    following command:

```
heroku login
```


The [login] function will open a browser window for you, where you
can log in like before. You will be logged in directly inside of your
Terminal through the Heroku web page.

2.  Heroku offers a private Docker image registry, like Docker Hub,
    which was specially made for use with Heroku. We will publish our
    image to this registry, because we can rely on the automatic
    deployment feature. You can deploy images from this repository to
    your Heroku app automatically. To authorize yourself at the
    registry, you can use the following command:

```
heroku container:login
```


You should be directly logged in, without further ado.

3.  Now that we are authorized in all services, we can build our Docker
    image again. We are using a different tag now, because we will
    publish the image to the Heroku registry, which is not possible with
    the old tag name. We are using the image name [web], as it is
    the default name provided by Heroku.

Replace the name [graphbook] with the name of your app. Run the
following command to build the Docker image:

```
docker build -t registry.heroku.com/graphbook/web .
```


4.  In the previous tests in this lab, we did not publish the
    generated images to any registry. Replace the [graphbook] name
    with your app\'s name. We will use the [docker push] command
    to upload our image to Heroku, as follows:

```
docker push registry.heroku.com/graphbook/web:latest
```


This is nothing complicated; we upload the latest version of our Docker
image to the registry.

5.  Still, nothing has gone live yet. There is only one command that we
    must run to make our application go live, as follows:

```
heroku container:release web --app graphbook
```


The [container:release] command deploys our new [web] image
to our Heroku app. The [\--app] parameter needs to be filled in
with the name of the Heroku app that we want to deploy to.

After running the preceding commands, your application should launch. We
have tested the complete routine manually, so we should translate this
to a CircleCI config, which will do this for us automatically.

We will start with a blank CircleCI config again; so, empty the old
[config.yml] file, and then follow these steps:

1.  The beginning of our configuration should be the same as before.
    Insert it into our [config.yml] file, as follows:

```
version: 2
jobs:
  build:
    docker:
      - image: circleci/node:10
    steps:
      - checkout
      - setup_remote_docker:
          docker_layer_caching: true
```


I have just removed the [echo] command from our
[config.yml]. Next, we must add all of the single steps to build,
migrate, and deploy our application. The important thing here is that
the indentation is correct.

2.  Before building and deploying our application, we have to ensure
    that everything works as planned. We can use the tests we built in
    the previous lab using Mocha. Add a second image to the docker
    section of the preceding code like so:

```
- image: tkuchiki/delayed-mysql
  environment:
    MYSQL_ALLOW_EMPTY_PASSWORD: yes
    MYSQL_ROOT_PASSWORD: ''
    MYSQL_DATABASE: graphbook_test
```


We add this second image because it launches an empty MySQL database for
us. Our test will use this database to run all tests. The great thing
about it is that our tests can run multiple times without failing.
Normally, when running our tests locally, we had to remove all test data
that was created, otherwise a second test would have failed. Since
CircleCI spawns a new database with every job, there won\'t be such
problems.

The image we use allows us to wait for the MySQL server to start and
furthermore to specify the credentials using the
[MYSQL\_ROOT\_PASSWORD] field for example. Our test can use the
aforementioned defined credentials to connect to the database.

3.  Instead of building and deploying the Docker image straight away, we
    first have to run our automated test. We have to install all
    dependencies from our [package.json] file directly within the
    CircleCI job\'s container. Add the following lines to the
    configuration file:

```
- run:
   name: "Install dependencies"
   command: npm install
```


The [name] property is the text that is displayed inside of
CircleCI, next to each row of our job\'s details.

4.  Our test relies on the fact that the back end and front end code is
    working. This includes the fact that our database is also correctly
    structured with the newest migrations applied. We can apply the
    migrations using Sequelize which we are going to install with the
    following lines of code::

```
- run:
   name: "Install Sequelize"
   command: sudo npm install -g mysql2 sequelize sequelize-cli
```


We migrate all of the database changes, like new fields or tables. To do
this, we will install the Sequelize CLI, which will run all of the
migrations for us, We install the [mysql2], [sequelize], and
[sequelize-cli] packages, which are the only required ones. Do not
forget to prefix the command with [sudo]. Otherwise, you will get
an [Access denied error] alert.

5.  Everything that we need to run our test is now prepared. All of the
    packages are installed, so, we just have to migrate the database and
    run the tests. To make sure that the database has been started
    though, we have to add one further command, which lets the CircleCI
    job wait until the database is started. Insert the following lines:

```
- run:
   name: Wait for DB
   command: dockerize -wait tcp://127.0.0.1:3306 -timeout 120s
```


The [dockerize] command is a small tool featuring some
functionalities that make your work easier in an environment with Docker
images. The [-wait] option tells [dockerize] to poll the
MySQL database port 3306 of the CircleCI container. Until a successful
response is received, all later commands from our configuration file are
not executed.

6.  The next task of our CircleCI workflow is, of course, to apply all
    migrations to the test database. Add the following lines:

```
- run:
   name: "Run migrations for test DB"
   command: sequelize db:migrate --migrations-path 
   src/server/migrations --config src/server/config/index.js --env
   production
   environment:
     NODE_ENV: production
     password: ''
     database: graphbook_test
     username: root
     host: localhost
```


What\'s important here is that you add the [\--env] option with
[production] to apply the changes to the database we have in the
environment variables. To overwrite the default environment variables in
our CircleCI project settings, we can specify the environment property
under which we can define environment variables that only take action in
the command we execute. They are not taken over to later commands. It is
a great way to overwrite default variables with the credentials that
work for the test database within CircleCI. The command we execute is
the same one we already used for our application.

7.  Now that the database has been updated, we can execute the test.
    Insert the following lines to run our [npm] run test script
    with the correct environment variables, as before:

```
- run:
   name: "Run tests"
   command: npm run test
   environment:
     NODE_ENV: production
     password: ''
     database: graphbook_test
     username: root
     host: localhost
     JWT_SECRET: 1234
```


Beyond the database credentials, we also have to specify the
[JWT\_SECRET] for the automated test. Our back end assumes that it
is set to verify the signup process for the users.

8.  Because we release our container image to our Heroku app, we also
    need the Heroku CLI installed inside of the deployment job that was
    started by CircleCI. Add the following lines to our
    [config.yml] file to install the Heroku CLI:

```
- run:
   name: "Install Heroku CLI"
   command: curl https://cli-assets.heroku.com/install.sh | sh
```


The preceding command will install the Heroku CLI, like we did before on
our local machine.

9.  We must log in to the Heroku Image Registry to push our Docker image
    after the image has been built. Add the following lines of code to
    our configuration file:

```
- run:
   name: "Login to Docker"
   command: docker login -u $HEROKU_LOGIN -p $HEROKU_API_KEY   
   registry.heroku.com
```


The [docker login] command takes a [-u] or [\--user]
parameter with the username for our Heroku account. You have to specify
a second option, using the [-p] parameter, which is the password
for our Heroku account. However, instead of the password, we will
provide a Heroku API key here. You can find your API key at
<https://dashboard.heroku.com/account>. You can click on
[reveal] or [regenerate] to get a new API
key.

The [HEROKU\_LOGIN] and [HEROKU\_API\_KEY] variables must be
set inside of CircleCI\'s environment variables. Go to the project
settings by hitting the settings icon in the top-right of your CircleCI
job, and add the environment variables, as follows:


![](./images/da129e57-921d-4e2c-b72a-67de73e98e92.png)


The first two variables are required to upload the final image to the
Heroku registry. The last four variables store the database credentials
for our production database. We already specified them on Heroku, but we
will also need them while migrating all of the database changes in a
later step.

The database credentials will automatically be used for migrating
database changes to the production database. If you want to use a
different database for testing and production, you will need to define
them separately here, and apply them in the [Dockerfile]. The best
approach is to have a separate testing database that is cleaned after
running the automated tests. You can add another CircleCI task to create
a new database whenever a new build job is started. Please remember to
edit the [ENV] statements and add a special test database for the
testing procedure when going live with this workflow.

10. Now, we can start building our Docker image, like we did previously
    in our manual test. Add the following step to the [config.yml]
    file:

```
- run:
   name: "Build Docker Image"
   command: docker build -t registry.heroku.com/graphbook/web .
```


11. After building the image with the preceding command, we can push the
    image to the Heroku registry. Add the following lines to the
    configuration file:

```
- run:
   name: "Push Docker Image to Heroku registry"
   command: docker push registry.heroku.com/graphbook/web:latest
```


12. Next, we will migrate the changes to the database structures with
    the command that we covered in Lab 3:

```
- run:
   name: "Run migrations for production DB"
   command: sequelize db:migrate --migrations-path
   src/server/migrations --config src/server/config/index.js --env
   production
```


What\'s important here is that you add the [\--env] option with
[production] to apply the changes to the production database. The
environment variables from the CircleCI project settings are used to
apply those migrations.

13. Finally, we can deploy our new application, as follows:

```
 - run:
    name: "Deploy image to Heroku App"
    command: heroku container:release web --app graphbook
```


This is the same command that we used before, when we manually tested
the workflow. The preceding command uses the Heroku CLI, which we
installed in an earlier step.

You can commit and push this new config file into your Git repository,
and CircleCI should automatically process it and create a new job for
you.

The resulting job should look like as follows:


![](./images/4d54bc8a-3212-4621-a6b3-5cdcc2dbb31e.png)


As you can see in the preceding screenshot, all of the steps of our
[config.yml] file are listed with their names and were
successfully executed. Your application should be running now. The image
was pushed to the Heroku image registry, which directly deployed the
latest version of our image to the Heroku app.

If you want to know whether everything is working as expected, you can
run the [logs] function of Heroku CLI on your local machine, as
follows:

```
heroku logs --app graphbook
```


This command will show you the latest logs in the command line of our
application\'s container.

The automated deployment of our application is finished now, and we will
be able to release new versions of our application continuously.


Summary
=======

In this lab, you learned how to dockerize your application using a
normal Dockerfile and a multi-stage build.

Furthermore, I have shown you how to set up an exemplary continuous
deployment workflow using CircleCI and Heroku. You can replace the
deployment process with a more complex setup by using AWS, but continue
using our Docker image.

Having read this lab, you have learned everything from developing a
complete application to deploying it to a production environment. Your
application should now be running on Heroku.
