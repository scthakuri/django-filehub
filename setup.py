from setuptools import setup, find_packages

setup(
    name="django_filehub",
    version="0.2.6",
    author="Suresh Chand",
    author_email="scthakuri12a@gmail.com",
    description="Filehub is a Django-based file management app that simplifies file handling within your Django projects. It supports file uploads, storage, and retrieval, making it easy to integrate robust file management features into your applications.",
    packages=find_packages(),
    license="BSD",
    install_requires=[
        "django",
        "requests",
        "pillow"
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "Framework :: Django",
        "Environment :: Web Environment",
        "Intended Audience :: Developers",
        "Operating System :: OS Independent",
        "Development Status :: 5 - Production/Stable",
        "License :: OSI Approved :: BSD License"
    ],
    include_package_data=True,
    package_data={
        "django_filehub": [
            "templates/*",
            "static/*",
            "templatetags/*",
            "migrations/*",
            "AUTHORS",
            "LICENSE",
            "README.md"
        ],
    },
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    project_urls={
        "Bug Reports": "https://github.com/scthakuri/django-filehub/issues",
        "Source": "https://github.com/scthakuri/django-filehub",
    },
)
