from setuptools import setup, find_packages

setup(
    name="django_filehub",
    version="0.1.4",
    author="Suresh Chand",
    author_email="scthakuri12a@gmail.com",
    packages=find_packages(),
    install_requires=[
        "django",
        "requests"
    ],
    classifiers=[  # Optional
        # How mature is this project? Common values are
        #   3 - Alpha
        #   4 - Beta
        #   5 - Production/Stable
        "Development Status :: 3 - Alpha",
        "Framework :: Django",
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
    ],
    include_package_data=True,
    package_data={
        "django_filehub": [
            "templates/*",
            "static/*",
        ],
    },
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    project_urls={  # Optional
        "Bug Reports": "https://github.com/scthakuri/django-filehub/issues",
        "Source": "https://github.com/scthakuri/django-filehub",
    },
)
