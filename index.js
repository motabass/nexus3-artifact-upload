$(() => {
  const baseUrl = location.href.substring(0, location.href.indexOf('/repository/'));
  $('head').append(`<link rel="shortcut icon" type="image/x-icon" href="${baseUrl}/favicon.ico"/>`);
  createNexusWrapper();

  // Initializes an iframe with Nexus3 Welcome page context, and adds an
  // iframe to it pointing to this html page.
  //
  // The second iframe is necessary to avoid certain errors caused by
  // Nexus3 JavaScript - like non-working backspace button in inputs.
  function createNexusWrapper() {
    if (window.location.hash === '#!content') {
      initializeUploaderContent($(document).contents());
    } else {
      $(`<iframe width="100%" height="100%" frameborder="0" src="${baseUrl}"/>`)
      .appendTo(document.body)
       .on('load', (event) => {
        const nexusFrame = $(event.target);
        const nexusWindow = nexusFrame.prop('contentWindow');

        // When navigating to other parts of nexus, the main window should be used
        nexusWindow.addEventListener('hashchange', e => (window.location = e.newURL));

        // When Nexus3 has been loaded to the iframe, delete all other
        // content, and add an iframe into the Nexus3 frame to load this
        // page again with "content" hashbang.
        waitForNexus().then((content) => {
          $('main').remove();
          $('head style.content').remove();

          const target = `${window.location.href.replace(window.location.hash, '')}#!content`;
          const uploaderFrame = $(`<iframe style="position:absolute;z-index:10000;top:0;left:0;background-color:white" width="100%" height="100%" frameborder="0" src="${target}"/>`);
          uploaderFrame.appendTo(content)
                        .on('error', () => {
            // On Firefox the iframe throws an error, and points to
            // about:blank instead of the src.
            const frameLocation = uploaderFrame.prop('contentWindow').location;
            if (frameLocation.href !== target) {
              frameLocation.href = target;
            }
          })
                        .on('load', () => {
            // Add CSS styles and reference to NX to embedded page to
            // provide a "native" look and feel for integrated content
            const nexusStyles = nexusFrame.contents().find('head style, head link[rel="stylesheet"]');
            uploaderFrame.contents().find('head').append(nexusStyles.clone());
            uploaderFrame.prop('contentWindow').NX = nexusWindow.NX;
          });
        });

        function waitForNexus() {
          return new Promise((resolve) => {
            const waitForContent = () => {
              const content = nexusFrame.contents().find('.nx-feature-content');
              if (content.length > 0) {
                resolve(content);
              } else {
                setTimeout(waitForContent, 200);
              }
            };
            waitForContent();
          });
        }
      });
    }
  }

  /*
   * Initializes the Artifact Upload controls.
   */
  function initializeUploaderContent(context) {
    const targetUrl = $('input[name=url]', context);
    const uploadButton = $('button[name=upload]', context);
    const artifactIdInput = $('input[name=artifactId]', context);
    const versionInput = $('input[name=version]', context);
    const classifierInput = $('input[name=classifier]', context);
    const extensionInput = $('input[name=extension]', context);
    const repositoryInput = $('input[name=repository]', context);
    const repositoryDropdown = $('select[name=repository-list]', context);
    const rawPathInput = $('input[name=path]', context);
    let fileToUpload = null;

    addEventHandlers();
    populateRepositoriesCombo();
    // The timeout is needed for Firefox to show content after it's been
    // layed out properly
    setTimeout(() => $('main', context).css('display', 'block'), 100);


    function addEventHandlers() {
      const fileInput = $('input[type=file]', context);
      const formatRadios = $('input[type=radio][name=format]', context);
      const gavRadio = $('input[type=radio][value=gav]', context);
      const rawRadio = $('input[type=radio][value=raw]', context);
      const dropTarget = $('.drop-target', context);
      const textInputs = $('input[type=text]', context);
      const uploadFormatButtons = $('main > section button', context);

      textInputs.on('input', updateTargetUrl);

      formatRadios.on('change', () => {
        $('section#gav div, section#raw div').css('display', 'none');
        $('section#gav div, section#raw div').css('display', 'none');
        uploadFormatButtons.removeClass('selected');
        switch (formatRadios.filter(':checked').val()) {
          case 'gav':
            $('section#gav div').css('display', 'block');
            uploadFormatButtons.filter('[name=gav-toggle]').addClass('selected');
            break;
          case 'raw':
          default:
            $('section#raw div').css('display', 'block');
            uploadFormatButtons.filter('[name=raw-toggle]').addClass('selected');
            break;
        }
        updateTargetUrl();
      });

      fileInput.on('change', () => setFileToUpload(fileInput.get(0).files[0]));
      fileInput.on('click', event => event.stopPropagation());

      targetUrl.on('change', () => uploadButton.prop('disabled', !fileToUpload));

      uploadFormatButtons.on('click', (event) => {
        const format = $(event.target).prop('name').split('-')[0];
        formatRadios.filter(`[value=${format}]`).prop('checked', true);
        formatRadios.change();
      });

      repositoryDropdown.on('change', () => {
        repositoryInput.val(repositoryDropdown.val());
        if (repositoryDropdown.find(':selected').data('format') === 'maven2') {
          gavRadio.prop('checked', true);
        } else {
          rawRadio.prop('checked', true);
        }
        formatRadios.change();
        updateTargetUrl();
      });

      dropTarget.on('dragenter dragover', () => false);
      dropTarget.on('drop', (event) => {
        setFileToUpload(event.originalEvent.dataTransfer.files[0]);
        return false;
      });
      dropTarget.on('click', () => fileInput.click() && false);

      uploadButton.on('click', () => uploadFile(fileToUpload, targetUrl.val()) && false);
    }

    function populateRepositoriesCombo() {
      $.ajax({
        url: `${baseUrl}/service/extdirect`,
        type: 'POST',
        data: '{"action":"coreui_Repository","method":"readReferences","data":[{"page":1,"start":0,"limit":100,"filter":[{"property":"applyPermissions","value":false}]}],"type":"rpc","tid":0}',
        contentType: 'application/json',
        success: (data) => {
          repositoryDropdown.empty();
          repositoryInput.css('display', 'none');
          repositoryDropdown.css('display', 'inline-block');
          data.result.data.forEach((item) => {
            if (item.type === 'hosted') {
              repositoryDropdown.append(`<option value="${item.id}" data-format="${item.format}">${item.name}</option>`);
            }
          });
          repositoryDropdown.change();
        },
        error: () => {
          repositoryDropdown.empty();
          repositoryDropdown.css('display', 'none');
          repositoryInput.css('display', 'inline-block');
          if (window.NX) {
            window.NX.Messages.warning('Could not get Repositories');
          } else {
            console.warn('Could not get Repositories'); // eslint-disable-line no-console
          }
        },
        complete: updateTargetUrl
      });
    }

    function setFileToUpload(file) {
      const selectedFileNameSpan = $('.drop-target span', context);
      const fileName = file ? file.name : '';
      fileToUpload = file;
      selectedFileNameSpan.html(file ? file.name : 'No file selected');
      const matchGroup = fileName.match(/^(.+)-(\d([^-]+(-SNAPSHOT)?))?(-(.+))?\.(.+)$/);
      if (matchGroup) {
        artifactIdInput.val(matchGroup[1]).focus();
        versionInput.val(matchGroup[2]).focus();
        classifierInput.val(matchGroup[6]).focus();
        extensionInput.val(matchGroup[7]).focus();
      } else {
        const lastDot = fileName.lastIndexOf('.');
        artifactIdInput.val(fileName.substring(0, lastDot)).focus();
        versionInput.val('').focus();
        classifierInput.val('').focus();
        extensionInput.val(fileName.substring(lastDot + 1)).focus();
      }
      rawPathInput.val(fileName).focus();
      return updateTargetUrl();
    }

    function updateTargetUrl() {
      const uploadType = $('input[type=radio]:checked', context).val();
      const repository = repositoryInput.val();
      const uploadBaseUrl = `${baseUrl}/repository/${repository}`;
      let path;
      switch (uploadType) {
        case 'gav':
          path = getTargetPathFromGAV();
          break;
        case 'raw':
        default:
          path = rawPathInput.val();
          break;
      }
      targetUrl.val(`${uploadBaseUrl}/${path}`);
      targetUrl.trigger('change');
      return true;
    }

    function getTargetPathFromGAV() {
      const groupIdInput = $('input[name=groupId]', context);
      const groupId = groupIdInput.val().split('.').join('/');
      const artifactId = artifactIdInput.val();
      const version = versionInput.val();
      const classifier = classifierInput.val();
      const extension = extensionInput.val();
      const file = `${artifactId}-${version}${classifier ? `-${classifier}` : ''}.${extension}`;
      return `${groupId}/${artifactId}/${version}/${file}`;
    }

    function uploadFile(file, target) {
      const progress = $('main section.upload-progress', context);
      const progressBar = progress.find('div');

      uploadButton.css('display', 'none');
      const reader = new FileReader();
      reader.onload = () => {
        $.ajax({
          url: target,
          type: 'PUT',
          contentType: file.type,
          data: new DataView(reader.result),
          processData: false,
          xhr: () => {
            const xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                progressBar.css('width', `${(event.loaded / event.total) * 100}%`);
                progress.css('display', 'block');
              }
            }, false);
            return xhr;
          },
          success: () => {
            if (window.NX) {
              window.NX.Messages.success('Upload successful');
            } else {
              console.log('Upload successful'); // eslint-disable-line no-console
            }
          },
          error: (xhr, ajaxOptions, error) => {
            if (window.NX) {
              window.NX.Messages.error(error);
            } else {
              console.error(error); // eslint-disable-line no-console
            }
          },
          complete: () => {
            progress.css('display', 'none');
            uploadButton.css('display', 'inline-block');
          }
        });
      };
      reader.readAsArrayBuffer(file);
    }
  }
});