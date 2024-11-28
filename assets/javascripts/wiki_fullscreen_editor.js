(() => {
  if (typeof jsToolBar === "undefined") return;

  const resources = WikiFullscreenEditor["config"]["resources"] || {};
  resources.text = resources.text || {};

  /**
   * Add buttons to the jsToolBar.
   */
  (function addButtonsToJsToolBar() {
    function enableWikiPreviewSideBySide(
      state,
      $jstBlock,
      updateWikiPreviewIfUpdated
    ) {
      $jstBlock.toggleClass("side-by-side", state);

      if (state) {
        // Disable edit and preview tab
        $jstBlock.find(".jstTabs a.selected").removeClass("selected");

        // Update wiki preview automatically
        $jstBlock
          .find("textarea.wiki-edit")
          .on(
            "change click blur paste cut keyup"
              .split(" ")
              .map((i) => i + ".ex-editor")
              .join(" "),
            updateWikiPreviewIfUpdated
          )
          .end()
          .find(".jstElements button")
          .on("click", () => {
            setTimeout(updateWikiPreviewIfUpdated, 100);
          });

        // Add dragable bar
        let lastPositionX = null;
        $("<div>")
          .addClass("wiki-fullscreen-resize-bar")
          .insertAfter($jstBlock.find("textarea.wiki-edit"))
          .draggable({
            axis: "x",
            start: (e, ui) => {
              lastPositionX = e.clientX;
              $(e.target).parent().addClass("resizing");
            },
            drag: (e, ui) => {
              if (lastPositionX === null) {
                lastPositionX = e.clientX;
                return;
              }
              const deltaX = e.clientX - lastPositionX;
              lastPositionX = e.clientX;

              // Update width
              $jstBlock
                .find("textarea.wiki-edit")
                .width($jstBlock.find("textarea.wiki-edit").width() + deltaX);
            },
            stop: (e, ui) => {
              $(e.target).parent().removeClass("resizing");
            },
          });

        // Set width 50%
        $jstBlock.find("textarea.wiki-edit").width("50%");

        // First invoke
        updateWikiPreviewIfUpdated();
      } else {
        // Remove events
        $jstBlock
          .find("textarea.wiki-edit")
          .off(
            "change click blur paste cut keyup"
              .split(" ")
              .map((i) => i + ".ex-editor")
              .join(" ")
          )
          .width("")
          .end()
          .find(".jstElements button")
          .off("click.ex-editor");

        // Remove check
        $jstBlock
          .removeClass("side-by-side")
          .find(".tab-preview-side-by-side input[type=checkbox]")
          .prop("checked", false);

        // Destroy resizable
        $jstBlock.find(".wiki-fullscreen-resize-bar").remove();

        // Activate edit tab
        $jstBlock.find(".jstTabs a.tab-edit")[0].click();
      }
    }

    const fullscreenButton = {
      type: "fullscreen_button",
      title: resources.text.enableFullscreenMode,
      fn: {
        wiki: function () {
          const $button = $(this.toolbar).find(".jstb_fullscreen");
          const $jstBlock = $(this.toolbarBlock);

          if ($jstBlock.hasClass("fullscreen")) {
            $button.attr("title", resources.text.enableFullscreenMode);
            $jstBlock.removeClass("fullscreen");
            enableWikiPreviewSideBySide(false, $jstBlock);
          } else {
            $button.attr("title", resources.text.disableFullscreenMode);
            $jstBlock.addClass("fullscreen");
          }
        },
      },
    };

    let collapsedState = [];
    function backupCollapsedState() {
      collapsedState = $(".collapsed-text")
        .map((_, e) => $(e).is(":visible"))
        .toArray();
    }
    function restoreCollapsedState() {
      const $collapsedText = $(".collapsed-text");
      if (
        $collapsedText.length > 0 &&
        collapsedState.length === $collapsedText.length
      ) {
        $collapsedText.each((i, e) => {
          if (collapsedState[i]) {
            $(`#${e.id}-show`).hide();
            $(`#${e.id}-hide`).show();
            $(e).show();
          }
        });
      }
    }

    function setupWikiPreviewSideBySide($jstBlock) {
      let underInquiry = false;
      let textBuffer = "";

      function updateWikiPreview() {
        var element = encodeURIComponent($jstBlock.find(".wiki-edit").val());
        var attachments = $("#issue-form")
          .find(".attachments_fields input")
          .serialize();

        backupCollapsedState();

        return $.ajax({
          url: $jstBlock.find(".tab-preview").data("url"),
          type: "post",
          data: "text=" + element + "&" + attachments,
        }).done(function (data) {
          $jstBlock.find(".wiki-preview").html(data);
          setupWikiTableSortableHeader();
          restoreCollapsedState();
        });
      }

      function updateWikiPreviewIfUpdated() {
        const text = $jstBlock.find("textarea").val();
        if (!underInquiry && text !== textBuffer) {
          underInquiry = true;
          textBuffer = text;
          updateWikiPreview().always(() => {
            underInquiry = false;
          });
        }
      }

      // Add side-by-side checkbox
      const $tabPreviewSideBySide = $("<li>")
        .addClass("tab-preview-side-by-side")
        .append(
          $("<div>").append(
            $("<label>")
              .text(resources.text.sideBySideMode)
              .prepend(
                $("<input>")
                  .attr({ type: "checkbox" })
                  .on("change", function () {
                    enableWikiPreviewSideBySide(
                      $(this).prop("checked"),
                      $jstBlock,
                      updateWikiPreviewIfUpdated
                    );
                  })
              )
          )
        )
        .insertAfter($jstBlock.find(".tab-preview").parents("li"));
    }

    const jstbElements = {};
    for (const e in jsToolBar.prototype.elements) {
      if (e === "help") {
        // Insert button to fullscreen before help
        jstbElements["fullscreen"] = fullscreenButton;
      }
      jstbElements[e] = jsToolBar.prototype.elements[e];
    }
    jsToolBar.prototype.elements = jstbElements;

    jsToolBar.prototype.fullscreen_button = function (toolName) {
      const b = jsToolBar.prototype.button.call(this, toolName);
      const bDrawOrg = b.draw;
      b.draw = () => {
        const button = bDrawOrg.call(b);
        setupWikiPreviewSideBySide($(this.toolbarBlock));

        return button;
      };
      return b;
    };

    function disableFullScreenMode(e) {
      const $jstBlock = $(".jstBlock.fullscreen");
      if ($jstBlock.length) {
        enableWikiPreviewSideBySide(false, $jstBlock);
        $jstBlock.removeClass("fullscreen");
        e?.preventDefault();
      }
    }

    $(() => {
      // Add bar to disable full-screen for mobile
      $("<div>")
        .attr("id", "disable-wiki-fullscreen-editor-bar")
        .on("click", disableFullScreenMode)
        .append($("<span>").text(resources.text.disableFullscreenMode))
        .appendTo("#wrapper");

      // Leave fullscreen mode with the ESC key
      $(document).on("keydown", (e) => {
        if (e.key === "Escape") disableFullScreenMode(e);
      });
    });
  })();
})();
