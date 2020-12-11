$(async function() {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $filteredArticles = $('#filtered-articles');
	const $favoritedArticles = $('#favorited-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $articlesContainer = $('.articles-container');
	const $ownStories = $('#my-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $navLinks = $('#nav-links');
	const $homePage = $('#nav-all');
	const $myArticles = $('#my-articles');
	const faves = [];

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

	$loginForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
		// *********************************************
		// Append user data to Profile Info
		$('#profile-name').text(`Name: ${userInstance.name}`);
		$('#profile-username').text(`Username: ${userInstance.username}`);
		$('#profile-account-date').text(`Account Created: ${userInstance.createdAt}`);
		// *********************************************
	});
	/**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Log Out Functionality
   */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
   * Event Handler for Clicking Login
   */

	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	// *********************************************
	/**
   * Event Handler for clicking Hack or Snooze
   */

	$homePage.on('click', async function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
   * Event Handler for Favorites
   */
	$articlesContainer.on('click', '.star', async function(e) {
		if (currentUser) {
			const target = e.target;
			const closestLi = target.closest('li');
			const storyId = closestLi.getAttribute('id');

			if (target.classList.contains('favorite')) {
				await currentUser.removeFavorite(storyId);
				target.classList.remove('favorite');
				faves.splice(faves.indexOf(storyId),1);
			} else {
				await currentUser.addFavorite(storyId);
				target.classList.add('favorite');
				faves.push(storyId);
			}
	}
	renderFavorites();
	});

	/**
   * Event Handler for remove user story
   */

	$myArticles.on('click', '.trash-can', async function(e) {
		if (currentUser) {
			const target = e.target;
			const closestLi = target.closest('li');
			const storyId = closestLi.getAttribute('id');
			console.log(storyId);

			await currentUser.deleteUserStory(storyId);
			await generateStories();
			hideElements();
			renderUserStories();
			console.log('Story Removed');
		}
	});
	// *********************************************
	// *********************************************
	// Event Handlers for Nav Links

	$('#nav-submit').on('click', function() {
		// Show submit form
		$submitForm.show();
	});

	$('#nav-favorites').on('click', function() {
		renderFavorites();
		$submitForm.hide();
		$allStoriesList.hide();
		$favoritedArticles.show();
		$myArticles.hide();
	});

	$('#nav-stories').on('click', function() {
		renderUserStories();
		$submitForm.hide();
		$allStoriesList.hide();
		$favoritedArticles.hide();
		$myArticles.show();
	});
	// *********************************************
	// *********************************************
	/**
   * Submit new article event handler.
   *
   * */
	$submitForm.on('submit', async function(e) {
		// Get info from form
		const author = $('#author').val();
		const title = $('#title').val();
		const url = $('#url').val();
		const username = currentUser.username;
		const hostName = getHostName(url);

		const storyObject = await storyList.addStory(currentUser, {
			title,
			author,
			url,
			username
		});

		// render story markup

		const storyMarkup = $(`
        <li id="${storyObject.storyId}">
        <span class="star"><i class="fas fa-star"></i></span>
          <a class="article-link" href="${storyObject.url}" target="a_blank">
            <strong>${storyObject.title}</strong>
          </a>
          <small class="article-author">by ${storyObject.author}</small>
          <small class="article-hostname ${hostName}">(${hostName})</small>
          <small class="article-username">posted by ${storyObject.username}</small>
        </li>
      `);

		$('#all-articles-list').prepend(storyMarkup);

		$submitForm.hide();
		$submitForm.trigger('reset');
		renderUserStories();
	});
	// *********************************************

	/**
   * Event handler for Navigation to Homepage
   */

	$('body').on('click', '#nav-all', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.show();
		$favoritedArticles.hide();
		$myArticles.hide();
	});

	/**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
   * A function to render HTML for an individual Story instance
   */

	function generateStoryHTML(story, isUserStory) {
    let hostName = getHostName(story.url);
    let favorite = "";
    for (let i = 0; i < faves.length; i++) {
      if (story.storyId === faves[i]) {
        favorite = "favorite";
      }
    }

		if (isUserStory) {
			const storyMarkup = $(`
      <li id="${story.storyId}">
      <span class="star"><i class="fas fa-star ${favorite}"></i></span>
      <span class="trash-can"><i class="fas fa-trash"></i></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
			// render story markup
			return storyMarkup;
		} else {
			const storyMarkup = $(`
        <li id="${story.storyId}">
        <span class="star"><i class="fas fa-star ${favorite}"></i></span>
          <a class="article-link" href="${story.url}" target="a_blank">
            <strong>${story.title}</strong>
          </a>
          <small class="article-author">by ${story.author}</small>
          <small class="article-hostname ${hostName}">(${hostName})</small>
          <small class="article-username">posted by ${story.username}</small>
        </li>
      `);
			// render story markup
			return storyMarkup;
		}
	}

	async function renderFavorites() {
		$favoritedArticles.empty();
		if (currentUser.favorites.length === 0) {
			$favoritedArticles.text('Uh ohhh... no favorites added yet.');
		} else {
			for (let story of currentUser.favorites) {
				// render each story in the list
				let favoriteHTML = await generateStoryHTML(story);
				$favoritedArticles.append(favoriteHTML);
			}
		}
	}

	async function renderUserStories() {
		$myArticles.empty();
		if ((await currentUser.ownStories.length) === 0) {
			$myArticles.text('Uh ohhh... no stories added yet.');
		} else {
			for (let story of currentUser.ownStories) {
				// render each story in the list
				let favoriteHTML = await generateStoryHTML(story, true);
				$myArticles.append(favoriteHTML);
			}
		}
	}

	function isFavorite(story) {
		let favStoryIds = new Set();
		if (currentUser) {
			favStoryIds = new Set(currentUser.favorites.map((obj) => obj.storyId));
		}
		return favStoryIds.has(story.storyId);
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
		$navLinks.show();
	}

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});
